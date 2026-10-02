import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";

const server = new McpServer({
  name: "naman-mcp",
  version: "1.0.0",
});

// --------------------------------------------------
// HELPER: Run a Git command
// --------------------------------------------------

async function runGitCommand(
  args: string[],
  workingDirectory: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn("git", args, {
      cwd: workingDirectory,
      shell: false,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("error", reject);

    process.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Git exited with code ${code}`));
        return;
      }

      resolve(stdout);
    });
  });
}

// --------------------------------------------------
// TOOL 1: Hello
// --------------------------------------------------

server.tool(
  "hello",
  "Say hello from Naman MCP",
  {
    name: z.string(),
  },
  async ({ name }) => {
    return {
      content: [
        {
          type: "text",
          text: `Hello ${name}! Naman MCP is working.`,
        },
      ],
    };
  }
);

// --------------------------------------------------
// TOOL 2: List Files
// --------------------------------------------------

server.tool(
  "list_files",
  "List files and folders inside a directory",
  {
    directory: z.string(),
  },
  async ({ directory }) => {
    try {
      const entries = await fs.readdir(directory, {
        withFileTypes: true,
      });

      const files = entries.map((entry) => {
        const type = entry.isDirectory() ? "DIR " : "FILE";
        return `${type} ${entry.name}`;
      });

      return {
        content: [
          {
            type: "text",
            text: files.join("\n") || "Directory is empty.",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 3: Read File
// --------------------------------------------------

server.tool(
  "read_file",
  "Read the contents of a text file",
  {
    file_path: z.string(),
  },
  async ({ file_path }) => {
    try {
      const content = await fs.readFile(file_path, "utf-8");

      return {
        content: [
          {
            type: "text",
            text: content,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 4: Write File
// --------------------------------------------------

server.tool(
  "write_file",
  "Create or overwrite a text file",
  {
    file_path: z.string(),
    content: z.string(),
  },
  async ({ file_path, content }) => {
    try {
      await fs.writeFile(file_path, content, "utf-8");

      return {
        content: [
          {
            type: "text",
            text: `File successfully written: ${file_path}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 5: Create Directory
// --------------------------------------------------

server.tool(
  "create_directory",
  "Create a directory",
  {
    directory: z.string(),
  },
  async ({ directory }) => {
    try {
      await fs.mkdir(directory, {
        recursive: true,
      });

      return {
        content: [
          {
            type: "text",
            text: `Directory successfully created: ${directory}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 6: Run Command
// --------------------------------------------------

const allowedCommands = [
  "node",
  "npm",
  "npx",
  "git",
  "python",
  "python3",
  "tsc",
];

server.tool(
  "run_command",
  "Run an approved development command",
  {
    command: z.string(),
    args: z.array(z.string()).optional(),
    working_directory: z.string().optional(),
  },
  async ({ command, args = [], working_directory }) => {
    if (!allowedCommands.includes(command)) {
      return {
        content: [
          {
            type: "text",
            text: `Command not allowed: ${command}`,
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await new Promise<string>((resolve, reject) => {
        const process = spawn(command, args, {
          cwd: working_directory,
          shell: false,
          windowsHide: true,
        });

        let stdout = "";
        let stderr = "";

        process.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        process.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        process.on("error", reject);

        process.on("close", (code) => {
          resolve(
            `Exit code: ${code}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
          );
        });
      });

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 7: Git Status
// --------------------------------------------------

server.tool(
  "git_status",
  "Show Git status",
  {
    working_directory: z.string(),
  },
  async ({ working_directory }) => {
    try {
      const result = await runGitCommand(
        ["status", "--short", "--branch"],
        working_directory
      );

      return {
        content: [
          {
            type: "text",
            text: result || "Git repository is clean.",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Git error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 8: Git Diff
// --------------------------------------------------

server.tool(
  "git_diff",
  "Show changes made to files",
  {
    working_directory: z.string(),
  },
  async ({ working_directory }) => {
    try {
      const result = await runGitCommand(
        ["diff"],
        working_directory
      );

      return {
        content: [
          {
            type: "text",
            text: result || "No changes found.",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Git error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 9: Git Log
// --------------------------------------------------

// --------------------------------------------------
// TOOL 9: Git Log
// --------------------------------------------------

server.tool(
  "git_log",
  "Show recent Git commits",
  {
    working_directory: z.string(),
    limit: z.number().optional(),
  },
  async ({ working_directory, limit = 10 }) => {
    try {
      const result = await runGitCommand(
        ["log", `-${limit}`, "--oneline", "--decorate"],
        working_directory
      );

      return {
        content: [
          {
            type: "text",
            text: result || "No commits found.",
          },
        ],
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      if (
        message.includes("does not have any commits yet") ||
        message.includes("your current branch") ||
        message.includes("bad default revision")
      ) {
        return {
          content: [
            {
              type: "text",
              text: "No commits found. This repository has not had its first commit yet.",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Git log error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  }
);
// --------------------------------------------------
// TOOL 10: Git Add
// --------------------------------------------------

server.tool(
  "git_add",
  "Stage files for a Git commit",
  {
    working_directory: z.string(),
    files: z.array(z.string()),
  },
  async ({ working_directory, files }) => {
    try {
      await runGitCommand(
        ["add", "--", ...files],
        working_directory
      );

      return {
        content: [
          {
            type: "text",
            text: `Files staged successfully:\n${files.join("\n")}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Git add error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 11: Git Commit
// --------------------------------------------------

server.tool(
  "git_commit",
  "Create a Git commit",
  {
    working_directory: z.string(),
    message: z.string(),
  },
  async ({ working_directory, message }) => {
    try {
      const result = await runGitCommand(
        ["commit", "-m", message],
        working_directory
      );

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Git commit error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 12: Git Branch
// --------------------------------------------------

server.tool(
  "git_branch",
  "List Git branches or create a new branch",
  {
    working_directory: z.string(),
    action: z.enum(["list", "create"]).default("list"),
    branch_name: z.string().optional(),
  },
  async ({ working_directory, action, branch_name }) => {
    try {
      if (action === "create") {
        if (!branch_name) {
          return {
            content: [
              {
                type: "text",
                text: "branch_name is required when creating a branch.",
              },
            ],
            isError: true,
          };
        }

        const result = await runGitCommand(
          ["branch", branch_name],
          working_directory
        );

        return {
          content: [
            {
              type: "text",
              text: result || `Branch "${branch_name}" created successfully.`,
            },
          ],
        };
      }

      const result = await runGitCommand(
        ["branch", "--list"],
        working_directory
      );

      return {
        content: [
          {
            type: "text",
            text: result || "No branches found.",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Git branch error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 13: Git Checkout
// --------------------------------------------------

server.tool(
  "git_checkout",
  "Switch to an existing Git branch",
  {
    working_directory: z.string(),
    branch_name: z.string(),
  },
  async ({ working_directory, branch_name }) => {
    try {
      const result = await runGitCommand(
        ["checkout", branch_name],
        working_directory
      );

      return {
        content: [
          {
            type: "text",
            text: result || `Switched to branch "${branch_name}".`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Git checkout error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 14: Git Pull
// --------------------------------------------------

server.tool(
  "git_pull",
  "Pull the latest changes from a Git remote",
  {
    working_directory: z.string(),
  },
  async ({ working_directory }) => {
    try {
      const result = await runGitCommand(
        ["pull"],
        working_directory
      );

      return {
        content: [
          {
            type: "text",
            text: result || "Git pull completed successfully.",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Git pull error: ${
              error instanceof Error ? error.message : String(error)
            }`,
        },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 15: Git Remote
// --------------------------------------------------

server.tool(
  "git_remote",
  "Show Git remote repositories",
  {
    working_directory: z.string(),
  },
  async ({ working_directory }) => {
    try {
      const result = await runGitCommand(
        ["remote", "-v"],
        working_directory
      );

      return {
        content: [
          {
            type: "text",
            text: result || "No Git remotes configured.",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Git remote error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 16: Git Push
// --------------------------------------------------

server.tool(
  "git_push",
  "Push committed changes to a Git remote",
  {
    working_directory: z.string(),
    remote: z.string().default("origin"),
    branch: z.string().optional(),
  },
  async ({ working_directory, remote, branch }) => {
    try {
      const args = branch
        ? ["push", remote, branch]
        : ["push", remote];

      const result = await runGitCommand(
        args,
        working_directory
      );

      return {
        content: [
          {
            type: "text",
            text: result || "Git push completed successfully.",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Git push error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 17: Search Files
// --------------------------------------------------

server.tool(
  "search_files",
  "Search for files and folders by name",
  {
    directory: z.string(),
    search_term: z.string(),
  },
  async ({ directory, search_term }) => {
    try {
      const results: string[] = [];

      async function search(currentDirectory: string) {
        const entries = await fs.readdir(currentDirectory, {
          withFileTypes: true,
        });

        for (const entry of entries) {
          // Skip node_modules and .git
          if (
            entry.name === "node_modules" ||
            entry.name === ".git"
          ) {
            continue;
          }

          const fullPath = `${currentDirectory}\\${entry.name}`;

          if (
            entry.name
              .toLowerCase()
              .includes(search_term.toLowerCase())
          ) {
            results.push(fullPath);
          }

          if (entry.isDirectory()) {
            await search(fullPath);
          }
        }
      }

      await search(directory);

      return {
        content: [
          {
            type: "text",
            text:
              results.length > 0
                ? results.join("\n")
                : "No matching files or folders found.",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Search error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 18: Get File Info
// --------------------------------------------------

server.tool(
  "get_file_info",
  "Get information about a file or folder",
  {
    file_path: z.string(),
  },
  async ({ file_path }) => {
    try {
      const stats = await fs.stat(file_path);

      return {
        content: [
          {
            type: "text",
            text: [
              `Path: ${file_path}`,
              `Type: ${stats.isDirectory() ? "Directory" : "File"}`,
              `Size: ${stats.size} bytes`,
              `Created: ${stats.birthtime.toISOString()}`,
              `Modified: ${stats.mtime.toISOString()}`,
            ].join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `File info error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 19: Copy File
// --------------------------------------------------

server.tool(
  "copy_file",
  "Copy a file to another location",
  {
    source: z.string(),
    destination: z.string(),
  },
  async ({ source, destination }) => {
    try {
      await fs.copyFile(source, destination);

      return {
        content: [
          {
            type: "text",
            text: `File copied successfully.\nFrom: ${source}\nTo: ${destination}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Copy error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 20: Move File
// --------------------------------------------------

server.tool(
  "move_file",
  "Move a file to another location",
  {
    source: z.string(),
    destination: z.string(),
  },
  async ({ source, destination }) => {
    try {
      await fs.rename(source, destination);

      return {
        content: [
          {
            type: "text",
            text: `File moved successfully.\nFrom: ${source}\nTo: ${destination}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Move error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 21: Search Code
// --------------------------------------------------

server.tool(
  "search_code",
  "Search for text inside source-code files",
  {
    directory: z.string(),
    search_term: z.string(),
  },
  async ({ directory, search_term }) => {
    try {
      const results: string[] = [];

      const allowedExtensions = [
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".json",
        ".html",
        ".css",
        ".scss",
        ".py",
        ".java",
        ".cpp",
        ".c",
        ".h",
        ".hpp",
      ];

      async function search(currentDirectory: string) {
        const entries = await fs.readdir(currentDirectory, {
          withFileTypes: true,
        });

        for (const entry of entries) {
          if (
            entry.name === "node_modules" ||
            entry.name === ".git" ||
            entry.name === "dist"
          ) {
            continue;
          }

          const fullPath = `${currentDirectory}\\${entry.name}`;

          if (entry.isDirectory()) {
            await search(fullPath);
            continue;
          }

          const extension = entry.name
            .substring(entry.name.lastIndexOf("."))
            .toLowerCase();

          if (!allowedExtensions.includes(extension)) {
            continue;
          }

          try {
            const content = await fs.readFile(fullPath, "utf-8");
            const lines = content.split(/\r?\n/);

            lines.forEach((line, index) => {
              if (
                line
                  .toLowerCase()
                  .includes(search_term.toLowerCase())
              ) {
                results.push(
                  `${fullPath}:${index + 1}: ${line.trim()}`
                );
              }
            });
          } catch {
            // Skip files that cannot be read as text
          }
        }
      }

      await search(directory);

      return {
        content: [
          {
            type: "text",
            text:
              results.length > 0
                ? results.join("\n")
                : "No matching code found.",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Search code error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --------------------------------------------------
// TOOL 22: Replace In File
// --------------------------------------------------

server.tool(
  "replace_in_file",
  "Replace specific text inside a file",
  {
    file_path: z.string(),
    old_text: z.string(),
    new_text: z.string(),
  },
  async ({ file_path, old_text, new_text }) => {
    try {
      const content = await fs.readFile(file_path, "utf-8");

      if (!content.includes(old_text)) {
        return {
          content: [
            {
              type: "text",
              text: "The specified old_text was not found in the file.",
            },
          ],
          isError: true,
        };
      }

      const updatedContent = content.replace(old_text, new_text);

      await fs.writeFile(
        file_path,
        updatedContent,
        "utf-8"
      );

      return {
        content: [
          {
            type: "text",
            text: `Successfully replaced text in ${file_path}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Replace error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);
// --------------------------------------------------
// TOOL 23: Run Tests
// --------------------------------------------------

server.tool(
  "run_tests",
  "Run tests for a Node.js project",
  {
    working_directory: z.string(),
  },
  async ({ working_directory }) => {
    try {
      const result = await new Promise<string>((resolve, reject) => {
        const process = spawn(
          "npm.cmd",
          ["test"],
          {
            cwd: working_directory,
            shell: true,
            windowsHide: true,
          }
        );

        let stdout = "";
        let stderr = "";

        process.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        process.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        process.on("error", reject);

        process.on("close", (code) => {
          resolve(
            `Exit code: ${code}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
          );
        });
      });

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Test error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);
// --------------------------------------------------
// TOOL 24: Run Build
// --------------------------------------------------

server.tool(
  "run_build",
  "Run the build script for a Node.js project",
  {
    working_directory: z.string(),
  },
  async ({ working_directory }) => {
    try {
      const result = await new Promise<string>((resolve, reject) => {
        const process = spawn(
          "npm.cmd",
          ["run", "build"],
          {
            cwd: working_directory,
            shell: true,
            windowsHide: true,
          }
        );

        let stdout = "";
        let stderr = "";

        process.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        process.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        process.on("error", reject);

        process.on("close", (code) => {
          resolve(
            `Exit code: ${code}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
          );
        });
      });

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Build error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);
// --------------------------------------------------
// TOOL 25: Get Project Info
// --------------------------------------------------

server.tool(
  "get_project_info",
  "Get information about a Node.js project",
  {
    working_directory: z.string(),
  },
  async ({ working_directory }) => {
    try {
      const packagePath =
        working_directory + "\\package.json";

      const packageContent = await fs.readFile(
        packagePath,
        "utf-8"
      );

      const pkg = JSON.parse(packageContent);

      const projectInfo = {
        name: pkg.name || "Unknown",
        version: pkg.version || "Unknown",
        description: pkg.description || "",
        scripts: pkg.scripts || {},
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              projectInfo,
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Project info error: ${
              error instanceof Error
                ? error.message
                : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);
// --------------------------------------------------
// TOOL 26: Install Package
// --------------------------------------------------

server.tool(
  "install_package",
  "Install an npm package",
  {
    working_directory: z.string(),
    package_name: z.string(),
    dev: z.boolean().optional(),
  },
  async ({ working_directory, package_name, dev }) => {
    try {
      const args = ["install", package_name];

      if (dev) {
        args.push("--save-dev");
      }

      const result = await new Promise<string>((resolve, reject) => {
        const process = spawn(
          "npm.cmd",
          args,
          {
            cwd: working_directory,
            shell: true,
            windowsHide: true,
          }
        );

        let stdout = "";
        let stderr = "";

        process.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        process.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        process.on("error", reject);

        process.on("close", (code) => {
          resolve(
            `Exit code: ${code}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
          );
        });
      });

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Install error: ${
              error instanceof Error
                ? error.message
                : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);
// --------------------------------------------------
// TOOL 27: Uninstall Package
// --------------------------------------------------

server.tool(
  "uninstall_package",
  "Remove an npm package",
  {
    working_directory: z.string(),
    package_name: z.string(),
  },
  async ({ working_directory, package_name }) => {
    try {
      const result = await new Promise<string>((resolve, reject) => {
        const process = spawn(
          "npm.cmd",
          ["uninstall", package_name],
          {
            cwd: working_directory,
            shell: true,
            windowsHide: true,
          }
        );

        let stdout = "";
        let stderr = "";

        process.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        process.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        process.on("error", reject);

        process.on("close", (code) => {
          resolve(
            `Exit code: ${code}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
          );
        });
      });

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Uninstall error: ${
              error instanceof Error
                ? error.message
                : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);
// --------------------------------------------------
// TOOL 28: Run Safe Command
// --------------------------------------------------

server.tool(
  "run_command_safe",
  "Run an approved development command",
  {
    working_directory: z.string(),
    command: z.enum([
      "npm install",
      "npm update",
      "npm audit",
      "npm run",
      "git status",
      "git diff",
      "git log",
      "git branch",
    ]),
  },
  async ({ working_directory, command }) => {
    try {
      const [program, ...args] = command.split(" ");

      const executable =
        program === "npm" ? "npm.cmd" : program;

      const result = await new Promise<string>((resolve, reject) => {
        const process = spawn(
          executable,
          args,
          {
            cwd: working_directory,
            shell: true,
            windowsHide: true,
          }
        );

        let stdout = "";
        let stderr = "";

        process.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        process.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        process.on("error", reject);

        process.on("close", (code) => {
          resolve(
            `Exit code: ${code}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
          );
        });
      });

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Command error: ${
              error instanceof Error
                ? error.message
                : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);
// --------------------------------------------------
// TOOL 29: NPM Run Script
// --------------------------------------------------

server.tool(
  "npm_run_script",
  "Run a short-lived npm script from package.json",
  {
    working_directory: z.string(),
    script_name: z.string(),
  },
  async ({ working_directory, script_name }) => {
    try {
      // Block scripts that normally keep running
      const blockedScripts = [
        "start",
        "dev",
        "serve",
        "watch",
        "preview",
      ];

      if (blockedScripts.includes(script_name)) {
        return {
          content: [
            {
              type: "text",
              text:
                `Script "${script_name}" is blocked because it may run continuously. ` +
                `Use run_build or run_tests for short-lived tasks.`,
            },
          ],
          isError: true,
        };
      }

      const result = await new Promise<string>((resolve, reject) => {
        const process = spawn(
          "npm.cmd",
          ["run", script_name],
          {
            cwd: working_directory,
            shell: true,
            windowsHide: true,
          }
        );

        let stdout = "";
        let stderr = "";

        process.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        process.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        process.on("error", reject);

        process.on("close", (code) => {
          resolve(
            `Exit code: ${code}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
          );
        });
      });

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `NPM script error: ${
              error instanceof Error
                ? error.message
                : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);
// --------------------------------------------------
// TOOL 30: Check Dependencies
// --------------------------------------------------

server.tool(
  "check_dependencies",
  "Check npm dependencies for outdated packages",
  {
    working_directory: z.string(),
  },
  async ({ working_directory }) => {
    try {
      const result = await new Promise<string>((resolve, reject) => {
        const process = spawn(
          "npm.cmd",
          ["outdated"],
          {
            cwd: working_directory,
            shell: true,
            windowsHide: true,
          }
        );

        let stdout = "";
        let stderr = "";

        process.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        process.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        process.on("error", reject);

        process.on("close", (code) => {
          resolve(
            `Exit code: ${code}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
          );
        });
      });

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Dependency check error: ${
              error instanceof Error
                ? error.message
                : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);
// --------------------------------------------------
// START SERVER
// --------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error("Naman MCP server is running!");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});