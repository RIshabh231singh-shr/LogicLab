import { Routes, Route, Navigate } from "react-router";
import Login from "./pages/Login";
import Homepage from "./pages/Homepage";
import SignUp from "./pages/SignUp";
import { checkAuth } from "./authSlice";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";

function App() {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth); //useSelector saare state variable ko dekhta hai usme se hme ek hi chaiye
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }
  console.log(user);
  console.log(isAuthenticated);
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? <Homepage></Homepage> : <Navigate to="/signup" />
          }
        ></Route>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" /> : <Login></Login>}
        ></Route>
        <Route
          path="/signup"
          element={isAuthenticated ? <Navigate to="/" /> : <SignUp></SignUp>}
        ></Route>
      </Routes>
    </>
  );
}

export default App;
