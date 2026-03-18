import { Link } from "react-router";
import { logoImage } from "../assets";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const sizeClasses = {
    sm: {
      container: "w-8 h-8",
      icon: "w-5 h-5",
      text: "text-lg"
    },
    md: {
      container: "w-10 h-10",
      icon: "w-6 h-6",
      text: "text-xl"
    },
    lg: {
      container: "w-14 h-14",
      icon: "w-8 h-8",
      text: "text-3xl"
    }
  };

  const sizes = sizeClasses[size];

  return (
    <Link to="/" className={`flex items-center gap-3 ${className}`}>
      <img 
        src={logoImage} 
        alt="codeIT Logo" 
        className={`${sizes.container} object-contain`}
        style={{ background: "transparent" }}
      />
      
      {showText && (
        <span className={`${sizes.text} font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent`}>
          codeIT
        </span>
      )}
    </Link>
  );
}