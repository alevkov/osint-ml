import { useEffect, useState } from "react";

export default function AsciiTitle() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % 2);
    }, 2000); // Slower animation
    return () => clearInterval(interval);
  }, []);

  const pulse = frame === 1;

  const asciiFrames = [
    `
 ██████╗ ███████╗██╗███╗   ██╗████████╗    ███╗   ███╗██╗     
██╔═══██╗██╔════╝██║████╗  ██║╚══██╔══╝    ████╗ ████║██║     
██║   ██║███████╗██║██╔██╗ ██║   ██║       ██╔████╔██║██║     
██║   ██║╚════██║██║██║╚██╗██║   ██║       ██║╚██╔╝██║██║     
╚██████╔╝███████║██║██║ ╚████║   ██║       ██║ ╚═╝ ██║███████╗
 ╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝   ╚═╝       ╚═╝     ╚═╝╚══════╝`,
    `
 ██████╗ ███████╗██╗███╗   ██╗████████╗    ███╗   ███╗██╗     
██╔═══██╗██╔════╝██║████╗  ██║╚══██╔══╝    ████╗ ████║██║     
██║   ██║███████╗██║██╔██╗ ██║   ██║       ██╔████╔██║██║     
██║   ██║╚════██║██║██║╚██╗██║   ██║       ██║╚██╔╝██║██║     
╚██████╔╝███████║██║██║ ╚████║   ██║       ██║ ╚═╝ ██║███████╗
 ╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝   ╚═╝       ╚═╝     ╚═╝╚══════╝`,
  ];

  return (
    <div className="flex flex-col items-center mb-4 mt-2">
      <div className="transform scale-[0.6] origin-top">
        <pre
          className={`font-mono whitespace-pre select-none
            ${pulse ? "opacity-90" : "opacity-100"}`}
          style={{
            color: "var(--primary)",
            textShadow: `0 0 3px var(--primary), 
                        0 0 6px var(--primary), 
                        0 0 12px var(--primary)`,
            transition: "opacity 1s ease",
          }}
        >
          {asciiFrames[frame]}
        </pre>
      </div>
      <a
        href="https://t.me/sernylan"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-0 text-xs text-muted-foreground hover:text-primary transition-colors neon-text"
        style={{
          opacity: 0.7,
          marginTop: "-44px",
        }}
      >
        by @sernylan
      </a>
    </div>
  );
}
