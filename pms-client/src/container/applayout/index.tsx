import type { JSX } from "react/jsx-dev-runtime";

function AppLayout({screen} : {screen: JSX.Element}) {
  return (
    <div>
        {screen}
    </div>
  );
}

export default AppLayout;
