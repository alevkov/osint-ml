import { Switch, Route, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Home from "./pages/Home";
import CaseView from "./pages/CaseView";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Documentation from "./pages/Documentation";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Loading from "./components/Loading";
import {useEffect} from "react";

function PrivateRoute({ component: Component, ...rest }: { component: React.ComponentType<any>, path: string }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
    gcTime: 0,
  });

  // Use useEffect for navigation to avoid state updates during render
  useEffect(() => {
    if (error && location !== "/login") {
      setLocation("/login");
    }
  }, [error, location, setLocation]);

  if (isLoading) {
    return <Loading />;
  }

  if (!user) {
    return null;
  }

  return <Component {...rest} />;
}

function App() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/">
        {(params) => <PrivateRoute component={Home} path="/" {...params} />}
      </Route>
      <Route path="/case/:id">
        {(params) => <PrivateRoute component={CaseView} path="/case/:id" {...params} />}
      </Route>
      <Route path="/docs">
        {(params) => <PrivateRoute component={Documentation} path="/docs" {...params} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4 border-primary/20 bg-background/95 backdrop-blur">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold text-primary">404 Page Not Found</h1>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            The page you're looking for doesn't exist.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;