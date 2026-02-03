import { Routes, Route } from "react-router";
import Login from "./pages/Login";
import Homepage from "./pages/Homepage";
import SignUp from "./pages/SignUp";
import { checkAuth } from "./authSlice";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";

function App() {
  const { isAuthenticated } = useSelector((state) => state.auth); //useSelector saare state variable ko dekhta hai usme se hme ek hi chaiye
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(checkAuth());
  }, [isAuthenticated]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Homepage></Homepage>}></Route>
        <Route path="/login" element={<Login></Login>}></Route>
        <Route path="/signup" element={<SignUp></SignUp>}></Route>
      </Routes>
    </>
  );
}

export default App;
