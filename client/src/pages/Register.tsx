import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, useForm } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import AsciiTitle from "@/components/AsciiTitle";

const registerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const form = useForm({
    schema: registerSchema,
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (values: z.infer<typeof registerSchema>) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Registered successfully" });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Error registering",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md relative">
        <AsciiTitle />
        <CardHeader>
          <CardTitle>Register</CardTitle>
        </CardHeader>
        <Form form={form} onSubmit={(values) => registerMutation.mutate(values)}>
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
            <div className="space-y-2">
              <Form.Field
                control={form.control}
                name="confirmPassword" 
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>Confirm Password</Form.Label>
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
              onClick={() => setLocation("/login")}
            >
              Login
            </Button>
            <Button type="submit" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Registering..." : "Register"}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
