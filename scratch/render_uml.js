const fs = require('fs');
const https = require('https');
const path = require('path');

const diagramFolder = __dirname; // Scratch folder
const outputFolder = path.join(diagramFolder, '..'); // Write images to the artifact folder directly!

const diagrams = {
  usecase: `graph LR
    %% Actors
    Citizen["Citizen (User)"]
    Agent["Collection Agent"]
    Admin["System Administrator"]

    %% System Boundary
    subgraph GreenDrop System Boundary
        UC_RequestPickup(["Book a Recycling Pickup"])
        UC_TrackImpact(["Track Ecological Footprint"])
        UC_ViewLeaderboard(["View Community Leaderboard"])
        UC_ToggleCurrency(["Select Preferred Currency"])
        UC_ViewBadges(["View Levels & Badges"])
        
        UC_ViewAssigned(["View Assigned Pickups"])
        UC_WeighMaterials(["Weigh Materials & Input Data"])
        UC_ConfirmCollection(["Confirm Collection"])
        
        UC_ManageGamification(["Manage Levels & Badges"])
        UC_MonitorAnalytics(["Monitor Material Analytics"])
        UC_ConfigureMaterials(["Configure Materials & Rates"])
        UC_AssignAgent(["Assign Agent to Pickup"])
    end

    %% Citizen Relations
    Citizen --> UC_RequestPickup
    Citizen --> UC_TrackImpact
    Citizen --> UC_ViewLeaderboard
    Citizen --> UC_ToggleCurrency
    Citizen --> UC_ViewBadges

    %% Agent Relations
    Agent --> UC_ViewAssigned
    Agent --> UC_WeighMaterials
    Agent --> UC_ConfirmCollection

    %% Admin Relations
    Admin --> UC_ManageGamification
    Admin --> UC_MonitorAnalytics
    Admin --> UC_ConfigureMaterials
    Admin --> UC_AssignAgent

    %% System Dependencies / Triggers
    UC_ConfirmCollection -.->|"<<trigger>>"| UC_CalculateCoins["collect_pickup RPC (DB)"]`,

  sequence: `sequenceDiagram
    autonumber
    actor Citizen as Citizen (User Mobile)
    actor Admin as Admin (Web Portal)
    actor Agent as Agent (Mobile App)
    participant API as Supabase API
    participant DB as Database (PostgreSQL)

    %% 1. Requesting
    Note over Citizen, DB: Step 1: Citizen Schedules Pickup
    Citizen->>API: Submit request (date, time slot, materials)
    activate API
    API->>DB: INSERT INTO pickups & pickup_items (estimates)
    activate DB
    DB-->>API: Confirm records (UUID keys, status='pending')
    deactivate DB
    API-->>Citizen: Display "Pickup Scheduled" in App
    deactivate API

    %% 2. Admin Assignment
    Note over Admin, DB: Step 2: Administrator Assigns Agent
    Admin->>API: Select & assign agent (pickup_id, agent_id)
    activate API
    API->>DB: UPDATE pickups SET status='accepted', agent_id=UUID
    activate DB
    DB-->>API: Update confirmation status 200
    deactivate DB
    API-->>Admin: Show assignment confirmed
    deactivate API
    API-->>Agent: Notify new pickup assigned (status 'accepted')

    %% 3. On-Site weight
    Note over Agent, DB: Step 3: On-Site Collection & Weighing
    Agent->>API: Query assigned pickups
    activate API
    API->>DB: SELECT from pickups WHERE status='accepted' AND agent_id=UUID
    activate DB
    DB-->>API: Return assigned pickups list
    deactivate DB
    API-->>Agent: Display pickups list in app
    deactivate API
    
    Agent->>Agent: Travel to citizen location & weigh materials

    %% 4. Submission
    Note over Agent, DB: Step 4: Submission & Value calculation
    Agent->>API: Submit collected weights (pickup_id, JSON items)
    activate API
    API->>DB: Call collect_pickup RPC (pickup_id, actual weights)
    activate DB
    Note over DB: Calculate coins: ROUND(weight * eco_coins_per_kg)<br/>Update pickup status to 'collected'<br/>Credit citizen's balance
    DB-->>API: Complete RPC transaction (200 OK)
    deactivate DB
    API-->>Agent: Show collection completed success
    deactivate API

    %% 5. Real-time Refresh
    Note over Citizen, DB: Step 5: Refresh Profile & Progression (Client-Side)
    Citizen->>API: Fetch updated profile & footprint stats
    activate API
    API->>DB: SELECT profile & completed pickup items
    activate DB
    DB-->>API: Return balance, weights data, levels & badges configs
    deactivate DB
    API-->>Citizen: Update balance & render UI
    deactivate API
    Note over Citizen: Mobile client evaluates levels & badges on the fly`,

  class: `classDiagram
    %% Core Domain Classes
    class Profile {
        + id : UUID <<PK>>
        + full_name : String
        + role : String
        + user_type : String
        + eco_coins_balance : Integer
        + phone_number : String
        + created_at : DateTime
    }

    class UserLocation {
        + id : UUID <<PK>>
        + user_id : UUID <<FK>>
        + name : String
        + city : String
        + address : String
        + latitude : Double
        + longitude : Double
        + is_default : Boolean
        + created_at : DateTime
    }

    class Pickup {
        + id : UUID <<PK>>
        + user_id : UUID <<FK>>
        + agent_id : UUID <<FK>>
        + status : String
        + scheduled_date : DateTime
        + scheduled_time : String
        + total_eco_coins_earned : Integer
        + created_at : DateTime
        + address : String
        + notes : String
        + photo_url : String
        + latitude : Double
        + longitude : Double
    }

    class PickupItem {
        + id : UUID <<PK>>
        + pickup_id : UUID <<FK>>
        + material_id : UUID <<FK>>
        + weight_kg : Double
        + eco_coins_earned : Integer
        + created_at : DateTime
    }

    class Material {
        + id : UUID <<PK>>
        + name : String
        + eco_coins_per_kg : Integer
        + icon : String
        + color : String
        + created_at : DateTime
    }

    class Level {
        + id : UUID <<PK>>
        + name : String
        + min_points : Integer
        + max_points : Integer
        + next_level_name : String
        + created_at : DateTime
    }

    class Badge {
        + id : UUID <<PK>>
        + title : String
        + description : String
        + icon : String
        + color : String
        + rule_type : String
        + rule_value : Double
        + created_at : DateTime
    }

    %% Relationships
    Profile "1" --> "*" UserLocation : saves
    Profile "1" --> "*" Pickup : schedules (as Citizen)
    Profile "1" --> "*" Pickup : collects (as Agent)
    Pickup "1" *-- "*" PickupItem : contains
    Material "1" --> "*" PickupItem : classifies
    Profile "*" --> "1" Level : currently at (dynamically matched)`,

  activity: `graph TD
    %% Swimlane 1: Citizen
    subgraph Citizen Activities
        Start([Start]) --> Book[Book recycling pickup]
        Book --> ProvideEst[Provide estimated weights & location]
        ProvideEst --> SubmitRequest[Submit request]
        RefreshUI[Refresh mobile dashboard] --> EvalProg[Evaluate levels & badges on the fly]
        EvalProg --> End([End])
    end

    %% Swimlane 2: Administrator
    subgraph Administrator Activities
        SubmitRequest --> ReviewPending[Review pending requests]
        ReviewPending --> SelectAgent[Select active agent]
        SelectAgent --> Assign[Assign agent & change status to accepted]
    end

    %% Swimlane 3: Collection Agent
    subgraph Collection Agent Activities
        Assign --> ViewAssigned[View assigned jobs in app]
        ViewAssigned --> Travel[Travel to citizen site]
        Travel --> Weigh[Weigh materials on site]
        Weigh --> LogWeights[Log actual weights in app]
        LogWeights --> ConfirmCollect[Confirm collection & submit]
    end

    %% Swimlane 4: Database / System Process
    subgraph Supabase System Processing
        ConfirmCollect --> ExecuteRPC[Execute collect_pickup RPC]
        ExecuteRPC --> CalCoins[Calculate coins: weight * eco_coins_per_kg]
        CalCoins --> CreditUser[Credit citizen profile balance]
        CreditUser --> UpdateStatus[Update status to collected]
        UpdateStatus --> Notify[Trigger notifications]
        Notify --> RefreshUI
    end

    %% Styling
    classDef startEnd fill:#2f855a,stroke:#22543d,stroke-width:2px,color:#fff;
    classDef process fill:#f7fafc,stroke:#cbd5e0,stroke-width:1px,color:#2d3748;
    class Start,End startEnd;`
};

const renderDiagram = (name, code) => {
  return new Promise((resolve, reject) => {
    const payload = {
      code: code,
      mermaid: { theme: 'forest' }
    };
    
    const base64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const url = `https://mermaid.ink/img/${base64}`;
    const dest = path.join(outputFolder, `${name}_diagram.png`);
    const file = fs.createWriteStream(dest);

    console.log(`Downloading ${name} diagram from ${url} to ${dest}...`);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${name} diagram: Status Code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Successfully saved ${name}_diagram.png!`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete file on error
      reject(err);
    });
  });
};

const run = async () => {
  try {
    for (const [name, code] of Object.entries(diagrams)) {
      await renderDiagram(name, code);
    }
    console.log("All UML diagrams compiled to PNG successfully!");
  } catch (error) {
    console.error("Compilation error:", error);
  }
};

run();
