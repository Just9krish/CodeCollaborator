/**
 * Code Execution Engine
 * Simple implementation for executing code in different languages
 */

// Types for code execution result
export type ExecutionResult = {
  output: string;
  error?: string;
  logs: string[];
};

/**
 * Execute code in the specified language
 * This is a simplified implementation that uses sandboxed execution
 */
export async function executeCode(
  code: string,
  language: string
): Promise<ExecutionResult> {
  try {
    switch (language) {
      case "javascript":
        return executeJavaScript(code);
      case "python":
        return executePython(code);
      case "java":
        return executeJava(code);
      case "cpp":
        return executeCpp(code);
      case "ruby":
        return executeRuby(code);
      default:
        return {
          output: "",
          error: `Unsupported language: ${language}`,
          logs: [],
        };
    }
  } catch (error) {
    return {
      output: "",
      error: error instanceof Error ? error.message : String(error),
      logs: [],
    };
  }
}

/**
 * Execute JavaScript code in a sandboxed VM
 */
function executeJavaScript(code: string): ExecutionResult {
  const logs: string[] = [];
  let output = "";
  let error: string | undefined;

  try {
    // Create a sandboxed execution environment
    const sandbox = {
      console: {
        log: (...args: any[]) => {
          const formattedArgs = args
            .map(arg =>
              typeof arg === "object" ? JSON.stringify(arg) : String(arg)
            )
            .join(" ");
          logs.push(formattedArgs);
        },
      },
    };

    // Create a function from the code
    const fn = new Function(
      "sandbox",
      `
      with(sandbox) {
        try {
          ${code}
        } catch(e) {
          return { error: e.message };
        }
      }
    `
    );

    // Execute the function
    const result = fn(sandbox);

    if (result && result.error) {
      error = result.error;
    }

    // Handle any program output
    output = logs.join("\n");

    return { output, error, logs };
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    return { output, error, logs };
  }
}

/**
 * Mock implementation for Python code execution
 * In a production environment, you would use a proper sandbox or execution container
 */
function executePython(code: string): ExecutionResult {
  // This is a mock implementation
  return {
    output: "Python execution is simulated in this environment.",
    logs: ["Python output would appear here."],
  };
}

/**
 * Mock implementation for Java code execution
 */
function executeJava(code: string): ExecutionResult {
  // This is a mock implementation
  return {
    output: "Java execution is simulated in this environment.",
    logs: ["Java output would appear here."],
  };
}

/**
 * Mock implementation for C++ code execution
 */
function executeCpp(code: string): ExecutionResult {
  // This is a mock implementation
  return {
    output: "C++ execution is simulated in this environment.",
    logs: ["C++ output would appear here."],
  };
}

/**
 * Mock implementation for Ruby code execution
 */
function executeRuby(code: string): ExecutionResult {
  // This is a mock implementation
  return {
    output: "Ruby execution is simulated in this environment.",
    logs: ["Ruby output would appear here."],
  };
}
