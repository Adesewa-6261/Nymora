import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Nymora",
  description: "Register human-readable names mapped to your wallet, onchain.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
