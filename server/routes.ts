import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { db } from "@db";
import { cases, nodes, relationships, users, tags, nodeTags } from "@db/schema";
import { eq, and, inArray } from "drizzle-orm";
import passport from "passport";
import { requireAuth, hashPassword } from "./lib/auth";
import { classifyTopic } from "./lib/topics";
import { extractDataPoints } from "./lib/extract";
import multer from "multer";
import { Readable } from "stream";
import axios from "axios";

import * as dotenv from 'dotenv';
dotenv.config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
      encoding_format: "float",
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}
function calculateSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must be of equal length");
  }

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  return dotProduct / (magnitudeA * magnitudeB);
}

export function registerRoutes(app: Express): Server {
  // Configure multer for memory storage
  const upload = multer({ storage: multer.memoryStorage() });

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    try {
      // Check if username already exists
      const existing = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password with salt
      const [hash, salt] = hashPassword(password);

      // Create user
      const [user] = await db
        .insert(users)
        .values({
          username,
          password: `${hash}:${salt}`,
        })
        .returning();

      // Log user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error logging in" });
        }
        res.json({ id: user.id, username: user.username });
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Error creating user" });
    }
  });

  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    const user = req.user as any;
    res.json({ id: user.id, username: user.username });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = req.user as any;
    res.json({ id: user.id, username: user.username });
  });

  // Get all cases for authenticated user
  app.get("/api/cases", requireAuth, async (req, res) => {
    const user = req.user as any;
    const allCases = await db.query.cases.findMany({
      where: eq(cases.userId, user.id),
      orderBy: (cases, { desc }) => [desc(cases.createdAt)],
    });
    res.json(allCases);
  });

  // Get single case
  app.get("/api/cases/:id", requireAuth, async (req, res) => {
    const caseId = Number(req.params.id);
    const user = req.user as any;

    if (isNaN(caseId) || caseId <= 0) {
      return res.status(400).send("Invalid case ID");
    }

    const caseData = await db.query.cases.findFirst({
      where: and(
        eq(cases.id, caseId),
        eq(cases.userId, user.id)
      ),
    });

    if (!caseData) {
      return res.status(403).json({ message: "Access denied or case not found" });
    }

    res.json(caseData);
  });

  // Create case
  app.post("/api/cases", requireAuth, async (req, res) => {
    const { title, description } = req.body;
    const user = req.user as any;

    if (!title) {
      return res.status(400).send("Title is required");
    }

    const newCase = await db
      .insert(cases)
      .values({
        title,
        description,
        userId: user.id,
      })
      .returning();

    res.json(newCase[0]);
  });

  // Get case graph data
  app.get("/api/cases/:id/graph", requireAuth, async (req, res) => {
    const caseId = Number(req.params.id);
    const user = req.user as any;
    const tagFilter = req.query.tags
      ? (req.query.tags as string).split(",").map(Number)
      : null;

    if (isNaN(caseId) || caseId <= 0) {
      return res.status(400).send("Invalid case ID");
    }

    try {
      // First verify case ownership
      const caseData = await db.query.cases.findFirst({
        where: and(
          eq(cases.id, caseId),
          eq(cases.userId, user.id)
        ),
      });

      if (!caseData) {
        return res.status(403).json({ message: "Access denied or case not found" });
      }

      // Get all nodes for the case with their tags
      let caseNodes = await db.query.nodes.findMany({
        where: eq(nodes.caseId, caseId),
        with: {
          nodeTags: {
            with: {
              tag: true,
            },
          },
        },
      });

      // Apply tag filtering if specified
      if (tagFilter && tagFilter.length > 0) {
        // Get all nodes that have ANY of the selected tags
        const nodeIds = await db
          .select({ nodeId: nodeTags.nodeId })
          .from(nodeTags)
          .where(
            and(
              inArray(nodeTags.tagId, tagFilter),
              inArray(
                nodeTags.nodeId,
                caseNodes.map((n) => n.id),
              ),
            ),
          );

        const filteredNodeIds = new Set(nodeIds.map((n) => n.nodeId));
        caseNodes = caseNodes.filter((node) => filteredNodeIds.has(node.id));
      }

      // Get relationships only between filtered nodes
      const nodeIds = caseNodes.map((n) => n.id);
      const caseRelationships =
        nodeIds.length > 0
          ? await db.query.relationships.findMany({
              where: and(
                eq(relationships.caseId, caseId),
                inArray(relationships.sourceId, nodeIds),
                inArray(relationships.targetId, nodeIds),
              ),
            })
          : [];

      // Format response with nodes and their tags
      res.json({
        nodes: caseNodes.map((node) => ({
          ...node,
          tags: node.nodeTags.map((nt) => nt.tag),
        })),
        links: caseRelationships.map((rel) => ({
          ...rel,
          source: rel.sourceId,
          target: rel.targetId,
        })),
      });
    } catch (error) {
      console.error("Error fetching graph data:", error);
      res.status(500).send("Error fetching graph data");
    }
  });

  // Create node
  app.post("/api/cases/:id/nodes", requireAuth, async (req, res) => {
    const caseId = Number(req.params.id);

    if (isNaN(caseId) || caseId <= 0) {
      return res.status(400).send("Invalid case ID");
    }
    const { type, content } = req.body;

    if (!type || !content) {
      return res.status(400).send("Type and content are required");
    }

    if (!["text", "link"].includes(type)) {
      return res.status(400).send("Invalid node type");
    }

    // Generate embedding and classify topic for the node content
    const [embedding, topic] = await Promise.all([
      generateEmbedding(content),
      classifyTopic(content),
    ]);

    const newNode = await db
      .insert(nodes)
      .values({
        caseId,
        type: type as "text" | "link",
        content,
        metadata: { topic },
        embedding,
      })
      .returning();

    // Find semantically similar nodes and create relationships
    try {
      const existingNodes = await db.query.nodes.findMany({
        where: eq(nodes.caseId, caseId),
      });

      const baseThreshold = 0.85; // Lower base threshold to allow more potential connections
      const maxRelationships = 3; // Allow up to 3 relationships per node
      const topicBoost = 0.1; // Boost for same topic
      let relationshipsCreated = 0;

      // Sort nodes by similarity to find the most relevant connections
      const nodeSimilarities = await Promise.all(
        existingNodes
          .filter(
            (node) =>
              node.id !== newNode[0].id &&
              node.embedding &&
              Array.isArray(node.embedding),
          )
          .map(async (node) => {
            try {
              const baseSimilarity = calculateSimilarity(
                embedding,
                node.embedding as number[],
              );

              // Topic-based adjustments
              const nodeTopic = node.metadata?.topic || "misc";
              const newNodeTopic = newNode[0].metadata?.topic || "misc";

              // Calculate final similarity score with topic boost
              let similarity = baseSimilarity;
              if (nodeTopic === newNodeTopic) {
                similarity += topicBoost;
              }

              return { node, similarity, nodeTopic };
            } catch (error) {
              console.error(
                `Error calculating similarity with node ${node.id}:`,
                error,
              );
              return { node, similarity: 0, nodeTopic: "misc" };
            }
          }),
      );

      // Sort by similarity descending and create relationships for top matches
      const topMatches = nodeSimilarities
        .filter(({ similarity }) => similarity >= baseThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxRelationships);

      for (const { node, similarity, nodeTopic } of topMatches) {
        const newNodeTopic = newNode[0].metadata?.topic || "misc";

        // Determine relationship type based on topics
        let relationType = "semantic";
        if (nodeTopic === newNodeTopic) {
          relationType = `${nodeTopic}_related`; // e.g., 'identity_related', 'location_related'
        } else if (similarity > 0.92) {
          // Strong cross-topic relationship
          relationType = "strong_semantic";
        }

        await db.insert(relationships).values({
          caseId,
          sourceId: newNode[0].id,
          targetId: node.id,
          type: relationType,
          strength: Math.round(similarity * 100),
        });
        relationshipsCreated++;
      }

      console.log(
        `Created ${relationshipsCreated} semantic relationships for node ${newNode[0].id}`,
      );
    } catch (error) {
      console.error("Error processing semantic relationships:", error);
    }

    res.json(newNode[0]);
  });

  // Create relationship
  app.post("/api/cases/:id/relationships", requireAuth, async (req, res) => {
    const caseId = parseInt(req.params.id);
    const { sourceId, targetId, type } = req.body;

    if (!sourceId || !targetId || !type) {
      return res.status(400).send("Source ID, target ID and type are required");
    }

    const newRelationship = await db
      .insert(relationships)
      .values({ caseId, sourceId, targetId, type })
      .returning();

    res.json(newRelationship[0]);
  });

  // Upload and process case file
  app.post(
    "/api/cases/:id/upload",
    requireAuth,
    upload.single("file"),
    async (req, res) => {
      const caseId = parseInt(req.params.id);

      if (isNaN(caseId)) {
        return res.status(400).send("Invalid case ID");
      }

      if (!req.file) {
        return res.status(400).send("No file provided");
      }

      try {
        // Convert buffer to text, handling potential encoding issues
        const text = req.file.buffer.toString("utf-8").trim();

        if (!text) {
          return res.status(400).send("File is empty");
        }

        // Extract structured data points from the text
        const dataPoints = await extractDataPoints(text);

        if (!dataPoints || dataPoints.length === 0) {
          return res
            .status(400)
            .send("No data points could be extracted from the file");
        }

        // Create nodes for each data point
        const createdNodes = [];

        for (const dataPoint of dataPoints) {
          try {
            const embedding = await generateEmbedding(dataPoint.content);

            const newNode = await db
              .insert(nodes)
              .values({
                caseId,
                type: "text",
                content: dataPoint.content,
                metadata: { topic: dataPoint.topic },
                embedding,
              })
              .returning();

            createdNodes.push(newNode[0]);

            // Find semantically similar nodes
            const existingNodes = await db.query.nodes.findMany({
              where: eq(nodes.caseId, caseId),
            });

            const baseThreshold = 0.85;
            const maxRelationships = 3;
            const topicBoost = 0.1;
            let relationshipsCreated = 0;

            const nodeSimilarities = existingNodes
              .filter(
                (node) =>
                  node.id !== newNode[0].id &&
                  node.embedding &&
                  Array.isArray(node.embedding),
              )
              .map((node) => {
                const baseSimilarity = calculateSimilarity(
                  embedding,
                  node.embedding as number[],
                );
                const nodeTopic = node.metadata?.topic || "misc";
                const newNodeTopic = dataPoint.topic || "misc";

                let similarity = baseSimilarity;
                if (nodeTopic === newNodeTopic) {
                  similarity += topicBoost;
                }

                return { node, similarity, nodeTopic };
              })
              .filter(({ similarity }) => similarity >= baseThreshold)
              .sort((a, b) => b.similarity - a.similarity)
              .slice(0, maxRelationships);

            // Create relationships
            for (const { node, similarity, nodeTopic } of nodeSimilarities) {
              const newNodeTopic = dataPoint.topic || "misc";

              let relationType = "semantic";
              if (nodeTopic === newNodeTopic) {
                relationType = `${nodeTopic}_related`;
              } else if (similarity > 0.92) {
                relationType = "strong_semantic";
              }

              await db.insert(relationships).values({
                caseId,
                sourceId: newNode[0].id,
                targetId: node.id,
                type: relationType,
                strength: Math.round(similarity * 100),
              });
              relationshipsCreated++;
            }

            console.log(
              `Created ${relationshipsCreated} semantic relationships for node ${newNode[0].id}`,
            );
          } catch (error) {
            console.error("Error processing node:", error);
            // Continue with next data point
          }
        }

        res.json({
          message: "File processed successfully",
          nodesCreated: createdNodes.length,
        });
      } catch (error) {
        console.error("Error processing file:", error);
        res
          .status(500)
          .send(error instanceof Error ? error.message : "Unknown error");
      }
    },
  );

  // Add Dehashed search endpoint
  app.post("/api/search/dehashed", requireAuth, async (req, res) => {
    const { query, size = 10000 } = req.body;

    if (!query) {
      return res.status(400).json({ message: "Query is required" });
    }

    if (!process.env.DEHASHED_API_KEY || !process.env.DEHASHED_EMAIL) {
      return res
        .status(500)
        .json({ message: "Dehashed API credentials not configured" });
    }

    try {
      // Create base64 encoded auth string
      const authString = Buffer.from(
        `${process.env.DEHASHED_EMAIL}:${process.env.DEHASHED_API_KEY}`,
      ).toString("base64");

      const response = await axios.get(
        `https://api.dehashed.com/search?query=${encodeURIComponent(query)}&size=${size}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Basic ${authString}`,
          },
        }
      );

      // Extract and format relevant data
      const entries = response.data.entries || [];
      const formattedResults = entries.flatMap((entry: any) => {
        const nodes = [];

        // Helper to add node if field has value
        const addNode = (field: string, value: any) => {
          if (value && value !== "null" && typeof value === "string") {
            nodes.push({
              type: "text",
              content: `${field}: ${value}`,
              metadata: {
                source: "dehashed",
                field,
                value,
                database: entry.database_name,
                original: entry,
              },
            });
          }
        };

        // Add nodes for all available Dehashed fields
        addNode("email", entry.email);
        addNode("ip_address", entry.ip_address);
        addNode("username", entry.username);
        addNode("password", entry.password);
        addNode("hashed_password", entry.hashed_password);
        addNode("hash_type", entry.hash_type);
        addNode("name", entry.name);
        addNode("vin", entry.vin);
        addNode("address", entry.address);
        addNode("phone", entry.phone);
        addNode("database", entry.database_name);

        return nodes;
      });

      res.json({
        results: formattedResults,
        balance: response.data.balance,
        took: response.data.took,
        total: response.data.total,
      });
    } catch (error: any) {
      console.error(
        "Dehashed API error:",
        error.response?.data || error.message,
      );

      // Handle rate limits and other specific error cases
      if (error.response?.status === 429) {
        return res.status(429).json({
          message:
            "Rate limit exceeded. Please wait before making another request.",
          retryAfter: error.response.headers["retry-after"],
        });
      }

      if (error.response?.status === 401) {
        return res.status(401).json({
          message: "Invalid Dehashed API credentials",
        });
      }

      res.status(error.response?.status || 500).json({
        message: error.response?.data?.message || "Error querying Dehashed API",
      });
    }
  });

  // Add breach.diy search endpoint
  app.post("/api/search/breach", requireAuth, async (req, res) => {
    const { query, type } = req.body;

    if (!query || !type) {
      return res.status(400).json({ message: "Query and type are required" });
    }

    try {
      const response = await axios.post(
        "https://b863f29d4cc2.ngrok.app/fetch-data",
        {
          query,
          type,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      // Format the response data into nodes
      const formattedResults = response.data
        .map((entry: any) => {
          const nodes = [];

          // Helper to add node if field has value
          const addNode = (field: string, value: string, type = "text") => {
            if (value && value !== "null") {
              nodes.push({
                type,
                content: `${field}: ${value}`,
                metadata: {
                  source: "breach.diy",
                  field,
                  value,
                  original: entry,
                },
              });
            }
          };

          // Add nodes for available fields
          Object.entries(entry).forEach(([key, value]) => {
            if (value && typeof value === "string") {
              addNode(key, value);
            }
          });

          return nodes;
        })
        .flat();

      res.json({ results: formattedResults });
    } catch (error: any) {
      console.error(
        "Breach.diy API error:",
        error.response?.data || error.message,
      );
      res.status(error.response?.status || 500).json({
        message:
          error.response?.data?.message || "Error querying Breach.diy API",
      });
    }
  });

  // Add Snusbase search endpoint
  app.post("/api/search/snusbase", requireAuth, async (req, res) => {
    const { terms, types, wildcard, group_by, tables } = req.body;

    if (!terms || !types || !Array.isArray(terms) || !Array.isArray(types)) {
      return res
        .status(400)
        .json({ message: "Terms and types arrays are required" });
    }

    if (!process.env.SNUSBASE_API_KEY) {
      return res
        .status(500)
        .json({ message: "Snusbase API key not configured" });
    }

    try {
      const response = await axios.post(
        "https://api.snusbase.com/data/search",
        {
          terms,
          types: types.map((t) => t.toLowerCase()),
          ...(wildcard !== undefined && { wildcard }),
          ...(group_by !== undefined && { group_by }),
          ...(tables !== undefined && { tables }),
        },
        {
          headers: {
            "Content-Type": "application/json",
            Auth: process.env.SNUSBASE_API_KEY,
          },
        },
      );

      // Format the response data into nodes
      const formattedResults = Object.entries(
        response.data.results || {},
      ).flatMap(([database, entries]) =>
        (entries as any[]).flatMap((entry: any) => {
          const nodes = [];

          // Helper to add node if field has value
          const addNode = (field: string, value: any) => {
            if (value && value !== "null" && typeof value === "string") {
              nodes.push({
                type: "text",
                content: `${field}: ${value}`,
                metadata: {
                  source: "snusbase",
                  field,
                  value,
                  database,
                  original: entry,
                },
              });
            }
          };

          // Map all fields from entry to nodes
          Object.entries(entry).forEach(([field, value]) => {
            if (value && typeof value === "string" && field !== "id") {
              addNode(field, value);
            }
          });

          return nodes;
        }),
      );

      res.json({
        results: formattedResults,
        took: response.data.took,
        size: response.data.size,
      });
    } catch (error: any) {
      console.error(
        "Snusbase API error:",
        error.response?.data || error.message,
      );

      // Handle rate limits and other specific error cases
      if (error.response?.status === 429) {
        return res.status(429).json({
          message: "Rate limit exceeded. Please try again later.",
          retryAfter: error.response.headers["x-rate-limit-reset"],
        });
      }

      if (error.response?.status === 401) {
        return res.status(401).json({
          message: "Invalid Snusbase API key",
        });
      }

      res.status(error.response?.status || 500).json({
        message: error.response?.data?.message || "Error querying Snusbase API",
      });
    }
  });

  // Add holehe email search endpoint
  app.post("/api/search/holehe", requireAuth, async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    try {
      // Execute the Python script
      const { spawn } = await import('child_process');
      const process = spawn('python3', ['server/scripts/holehe_search.py', email]);

      let outputData = '';
      let errorData = '';

      process.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          console.error('Holehe search error:', errorData);
          return res.status(500).json({ 
            message: "Error executing holehe search",
            error: errorData 
          });
        }

        try {
          const results = JSON.parse(outputData);

          // Format results into nodes
          const formattedResults = results.map((result: any) => ({
            type: "text",
            content: `${result.name}: ${result.exists ? "Account exists" : "No account found"}`,
            metadata: {
              source: "holehe",
              service: result.name,
              exists: result.exists,
              emailrecovery: result.emailrecovery,
              phoneNumber: result.phoneNumber,
              others: result.others,
              rateLimit: result.rateLimit,
            },
          }));

          res.json({ results: formattedResults });
        } catch (error) {
          console.error('Error parsing holehe results:', error);
          res.status(500).json({ 
            message: "Error parsing holehe results",
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });
    } catch (error) {
      console.error('Error executing holehe search:', error);
      res.status(500).json({ 
        message: "Error executing holehe search",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Tag management routes
  app.get("/api/cases/:id/tags", requireAuth, async (req, res) => {
    const caseId = Number(req.params.id);

    if (isNaN(caseId)) {
      return res.status(400).send("Invalid case ID");
    }

    const caseTags = await db.query.tags.findMany({
      where: eq(tags.caseId, caseId),
    });

    res.json(caseTags);
  });

  app.post("/api/cases/:id/tags", requireAuth, async (req, res) => {
    const caseId = Number(req.params.id);
    const { name, color } = req.body;

    if (!name || !color) {
      return res.status(400).send("Name and color are required");
    }

    if (isNaN(caseId)) {
      return res.status(400).send("Invalid case ID");
    }

    const newTag = await db
      .insert(tags)
      .values({
        caseId,
        name,
        color,
      })
      .returning();

    res.json(newTag[0]);
  });

  app.post(
    "/api/cases/:caseId/nodes/:nodeId/tags",
    requireAuth,
    async (req, res) => {
      const { caseId, nodeId } = req.params;
      const { tagIds } = req.body;

      if (!Array.isArray(tagIds)) {
        return res.status(400).send("Tag IDs must be an array");
      }

      // Remove existing tags for this node
      await db.delete(nodeTags).where(eq(nodeTags.nodeId, Number(nodeId)));

      // Add new tags
      const newNodeTags = await Promise.all(
        tagIds.map(async (tagId) => {
          return db
            .insert(nodeTags)
            .values({
              nodeId: Number(nodeId),
              tagId: Number(tagId),
            })
            .returning();
        }),
      );

      res.json(newNodeTags.flat());
    },
  );

  app.get(
    "/api/cases/:caseId/nodes/:nodeId/tags",
    requireAuth,
    async (req, res) => {
      const { nodeId } = req.params;

      const nodeTags = await db.query.nodeTags.findMany({
        where: eq(nodeTags.nodeId, Number(nodeId)),
        with: {
          tag: true,
        },
      });

      res.json(nodeTags.map((nt) => nt.tag));
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}