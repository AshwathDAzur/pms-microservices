import type { JSX } from "react/jsx-dev-runtime";
import SideBar from "../../components/sideBar";

function AppLayout({screen, title} : {screen: JSX.Element, title?: string}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100vh",
        width: "100vw",
        padding: "0.4rem",
        gap: "0.4rem",
      }}
    >
      <SideBar />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          height: "100%",
          padding: "0.5rem",
          overflow: "auto",
        }}
      >
        {title && <h2>{title} Page</h2>}
          {screen}
      </div>
    </div>
  );
}

export default AppLayout;
