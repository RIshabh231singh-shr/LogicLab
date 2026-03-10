import axios from "axios";

const axiosClient = axios.create({
  baseURL: "https://logiclab-1rfh.onrender.com",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosClient;