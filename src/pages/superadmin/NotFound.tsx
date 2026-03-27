import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="notfound-page">
      <div className="index-center">
        <h1 className="page-title notfound-code">404</h1>
        <p className="page-subtitle notfound-msg">Oops! Page not found</p>
        <a href="/" className="luxury-btn luxury-btn-primary notfound-btn">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
