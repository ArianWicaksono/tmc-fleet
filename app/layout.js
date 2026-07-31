import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata = {
  title: 'TMC EasyGo — Dashcam Monitor',
  description: 'Dashboard monitoring armada dan kondisi dashcam TMC EasyGo Indonesia',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="font-body">{children}</body>
    </html>
  );
}
