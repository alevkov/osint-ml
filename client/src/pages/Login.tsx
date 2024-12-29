import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, useForm } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import AsciiTitle from "@/components/AsciiTitle";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    schema: loginSchema,
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: z.infer<typeof loginSchema>) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      return res.json();
    },
    onSuccess: async () => {
      // Invalidate and refetch auth status
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      // Ensure the query is refetched before redirecting
      await queryClient.fetchQuery({ queryKey: ["/api/auth/me"] });

      toast({ title: "Logged in successfully" });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Error logging in",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md relative border-primary/20 bg-background/95 backdrop-blur">
        <AsciiTitle />
        <CardHeader>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Login</CardTitle>
        </CardHeader>
        <Form form={form} onSubmit={(values) => loginMutation.mutate(values)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Form.Field
                control={form.control}
                name="username"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>Username</Form.Label>
                    <Form.Control>
                      <Input {...field} type="text" />
                    </Form.Control>
                    <Form.Message />
                  </Form.Item>
                )}
              />
            </div>
            <div className="space-y-2">
              <Form.Field
                control={form.control}
                name="password"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>Password</Form.Label>
                    <Form.Control>
                      <Input {...field} type="password" />
                    </Form.Control>
                    <Form.Message />
                  </Form.Item>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/register")}
            >
              Register
            </Button>
            <Button type="submit" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}