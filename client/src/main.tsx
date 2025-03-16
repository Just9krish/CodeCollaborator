import { createRoot } from "react-dom/client";
import App from "./container/App";
import "./index.css";

// Import Remixicon CSS
const remixiconLink = document.createElement("link");
remixiconLink.rel = "stylesheet";
remixiconLink.href = "https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css";
document.head.appendChild(remixiconLink);

// Import Google Fonts
const googleFontsLink = document.createElement("link");
googleFontsLink.rel = "stylesheet";
googleFontsLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap";
document.head.appendChild(googleFontsLink);

createRoot(document.getElementById("root")!).render(<App />);
