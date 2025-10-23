"use client";

import Header from "../components/Header";
import AnimatedGradientLogo from "../components/common/AnimatedGradientLogo";
import { useTheme } from "../context/ThemeContext";

const ProjectPage = () => {
  const noop = () => undefined;
  const { theme } = useTheme();

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{ background: theme }}
    >
      <Header onCreateTask={noop} onLoginClick={noop} />
      <main className="p-6">
        <AnimatedGradientLogo className="text-3xl font-bold tracking-tight" />
      </main>
    </div>
  );
};

export default ProjectPage;
