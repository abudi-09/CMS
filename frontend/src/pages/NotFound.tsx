import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3 px-4">
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <p className="text-muted-foreground">
          Page not found
          {location.pathname ? `: ${location.pathname}` : ""}
        </p>
        <Link to="/" className="text-primary underline underline-offset-4">
          Return to home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
