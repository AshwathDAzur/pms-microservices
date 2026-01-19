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
        padding: "5px",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <SideBar />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "95%",
          height: "100%",
          padding: "5px",
          // border: "1px solid #1b264d",
        }}
      >
        {title && <h2>{title} Page</h2>}
          {screen}
      </div>
    </div>
  );
}

export default AppLayout;
