import type { JSX } from "react/jsx-dev-runtime";

function AppLayout({screen} : {screen: JSX.Element}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh"
      }}
    >
        {screen}
    </div>
  );
}

export default AppLayout;
