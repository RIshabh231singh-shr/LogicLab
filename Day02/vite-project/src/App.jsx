import { Routes, Route, Navigate } from "react-router";
import Login from "./pages/Login";
import Homepage from "./pages/Homepage";
import SignUp from "./pages/SignUp";
import { checkAuth } from "./authSlice";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import AdminPanel from "./pages/AdminPanel";
import UpdatePanel from "./pages/UpdateProblem";
import CreatePanel from "./pages/CreateProblem";
import DeletePanel from "./pages/DeleteProblem";
import AdminInfo from "./pages/Admininfo";
import AllProblems from "./pages/Allproblems";
import Problempage from "./pages/Problempage";
import Profile from "./pages/Profile";
import UpdateProfile from "./pages/UpdateProfile";
import SubmissionDetail from "./pages/SubmissionDetail";
import FeedLabLayout from "./pages/FeedLabLayout";
import FeedLab from "./pages/FeedLab"; // Act as FeedLab Home

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
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? <Homepage></Homepage> : <Navigate to="/login" />
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
        <Route
          path="/admin"
          element={
            isAuthenticated && user?.role === "admin" ? (
              <AdminPanel />
            ) : (
              <Navigate to="/" />
            )
          }
        >
          <Route index element={<Navigate to="info" replace />} />
        <Route path="info" element={<AdminInfo />}></Route>
          <Route path="create" element={<CreatePanel />}></Route>
          <Route path="update" element={<AllProblems mode="update" />}></Route>
          <Route path="delete" element={<DeletePanel />}></Route>
          <Route path="update/:id" element={<UpdatePanel />}></Route>
        </Route>
        <Route
          path="/problem/:problemId"
          element={<Problempage></Problempage>}
        ></Route>
        <Route
          path="/profile"
          element={isAuthenticated ? <Profile /> : <Navigate to="/login" />}
        ></Route>
        <Route
          path="/profile/:userId"
          element={isAuthenticated ? <Profile /> : <Navigate to="/login" />}
        ></Route>
        <Route
          path="/update-profile"
          element={isAuthenticated ? <UpdateProfile /> : <Navigate to="/login" />}
        ></Route>
        <Route
          path="/submission/:id"
          element={isAuthenticated ? <SubmissionDetail /> : <Navigate to="/login" />}
        ></Route>
        
        {/* FeedLab Application Segment */}
        <Route
          path="/feedlab"
          element={isAuthenticated ? <FeedLabLayout /> : <Navigate to="/login" />}
        >
          <Route index element={<FeedLab />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
