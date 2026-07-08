import './globals.css';

export const metadata = {
  title: 'GreenDrop Admin',
  description: 'GreenDrop Admin Dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

