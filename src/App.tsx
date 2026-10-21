import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DemoApp from "./DemoApp";
import LearningApp from "./LearningApp";
import "./learning.css";
export default function App() {
  const [demo, setDemo] = useState(false);
  const nav = useNavigate();
  return demo ? (
    <>
      <DemoApp />
      <button
        className="mode-return primary"
        onClick={() => {
          setDemo(false);
          nav("/today");
        }}
      >
        返回真实学习
      </button>
    </>
  ) : (
    <LearningApp
      onDemo={() => {
        setDemo(true);
        nav("/today");
      }}
    />
  );
}
