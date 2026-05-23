import { useState, useEffect } from "react";
import { titleCase } from "text-case";
import {
  BookOpenText,
  ArrowClockwise,
  Warning,
  Plus,
  X,
} from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";
import MCPLogo from "@/media/agents/mcp-logo.svg";
import MCPServers from "@/models/mcpServers";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";

export function MCPServerHeader({
  setMcpServers,
  setSelectedMcpServer,
  children,
}) {
  const { t } = useTranslation();
  const [loadingMcpServers, setLoadingMcpServers] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  useEffect(() => {
    async function fetchMCPServers() {
      setLoadingMcpServers(true);
      const { servers = [] } = await MCPServers.listServers();
      setMcpServers(servers);
      setLoadingMcpServers(false);
    }
    fetchMCPServers();
  }, []);

  // Refresh the list of MCP servers
  const refreshMCPServers = () => {
    if (
      window.confirm(
        "Are you sure you want to refresh the list of MCP servers? This will restart all MCP servers and reload their tools."
      )
    ) {
      setLoadingMcpServers(true);
      MCPServers.forceReload()
        .then(({ servers = [] }) => {
          setSelectedMcpServer(null);
          setMcpServers(servers);
        })
        .catch((err) => {
          console.error(err);
          showToast(`Failed to refresh MCP servers.`, "error", { clear: true });
        })
        .finally(() => {
          setLoadingMcpServers(false);
        });
    }
  };

  const handleServerAdded = async () => {
    setShowAddModal(false);
    setLoadingMcpServers(true);
    try {
      const { servers = [] } = await MCPServers.listServers();
      setMcpServers(servers);
      setSelectedMcpServer(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMcpServers(false);
    }
  };

  return (
    <>
      <div className="text-theme-text-primary flex items-center justify-between gap-x-2 mt-4">
        <div className="flex items-center gap-x-2">
          <img src={MCPLogo} className="w-6 h-6 light:invert" alt="MCP Logo" />
          <p className="text-lg font-medium">{t("agent.mcp.title")}</p>
        </div>
        <div className="flex items-center gap-x-3">
          <a
            href="https://docs.anythingllm.com/mcp-compatibility/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="border-none text-theme-text-secondary hover:text-cta-button"
          >
            <BookOpenText size={16} />
          </a>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="border-none text-theme-text-secondary hover:text-cta-button flex items-center gap-x-1"
          >
            <Plus size={16} />
            <p className="text-sm">Add server</p>
          </button>
          <button
            type="button"
            onClick={refreshMCPServers}
            disabled={loadingMcpServers}
            className="border-none text-theme-text-secondary hover:text-cta-button flex items-center gap-x-1"
          >
            <ArrowClockwise
              size={16}
              className={loadingMcpServers ? "animate-spin" : ""}
            />
            <p className="text-sm">
              {loadingMcpServers
                ? `${t("common.loading")}...`
                : t("common.refresh")}
            </p>
          </button>
        </div>
      </div>
      {children({ loadingMcpServers })}
      {showAddModal && (
        <AddMCPServerModal
          onClose={() => setShowAddModal(false)}
          onCreated={handleServerAdded}
        />
      )}
    </>
  );
}

function AddMCPServerModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [transport, setTransport] = useState("stdio");
  const [command, setCommand] = useState("");
  const [argsText, setArgsText] = useState("");
  const [url, setUrl] = useState("");
  const [envText, setEnvText] = useState("");
  const [headersText, setHeadersText] = useState("");
  const [autoStart, setAutoStart] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function parseJSONOrEmpty(text, fallback, label) {
    const trimmed = (text || "").trim();
    if (!trimmed) return { value: fallback, error: null };
    try {
      return { value: JSON.parse(trimmed), error: null };
    } catch (e) {
      return { value: null, error: `Invalid JSON in ${label}: ${e.message}` };
    }
  }

  async function handleSubmit(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    if (submitting) return;

    if (!name.trim()) {
      showToast("Server name is required.", "error", { clear: true });
      return;
    }

    const server = {};
    if (transport === "stdio") {
      if (!command.trim()) {
        showToast("Command is required for stdio servers.", "error", {
          clear: true,
        });
        return;
      }
      server.command = command.trim();
      const argsParsed = parseJSONOrEmpty(argsText, [], "arguments");
      if (argsParsed.error) {
        showToast(argsParsed.error, "error", { clear: true });
        return;
      }
      if (!Array.isArray(argsParsed.value)) {
        showToast("Arguments must be a JSON array of strings.", "error", {
          clear: true,
        });
        return;
      }
      server.args = argsParsed.value;
    } else {
      if (!url.trim()) {
        showToast("URL is required for sse/http servers.", "error", {
          clear: true,
        });
        return;
      }
      server.type = transport;
      server.url = url.trim();
      const headersParsed = parseJSONOrEmpty(headersText, {}, "headers");
      if (headersParsed.error) {
        showToast(headersParsed.error, "error", { clear: true });
        return;
      }
      if (Object.keys(headersParsed.value).length > 0)
        server.headers = headersParsed.value;
    }

    const envParsed = parseJSONOrEmpty(envText, {}, "env");
    if (envParsed.error) {
      showToast(envParsed.error, "error", { clear: true });
      return;
    }
    if (Object.keys(envParsed.value).length > 0) server.env = envParsed.value;

    server.anythingllm = { autoStart };

    setSubmitting(true);
    const result = await MCPServers.newServer({ name: name.trim(), server });
    setSubmitting(false);

    if (!result.success) {
      showToast(result.error || "Failed to create MCP server.", "error", {
        clear: true,
      });
      return;
    }
    if (!result.started) {
      showToast(
        `Server saved but failed to start: ${result.error || "unknown error"}`,
        "warning",
        { clear: true }
      );
    } else {
      showToast(`MCP server "${name}" added and started.`, "success", {
        clear: true,
      });
    }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="bg-theme-bg-secondary text-white rounded-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add MCP Server</h3>
          <button
            type="button"
            onClick={onClose}
            className="border-none text-theme-text-secondary hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <div
          className="flex flex-col gap-y-3 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        >
          <label className="flex flex-col gap-y-1">
            <span>Name *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. filesystem"
              className="bg-theme-bg-primary rounded px-3 py-2 outline-none"
              required
            />
            <span className="text-xs text-theme-text-secondary">
              Letters, numbers, underscores, dashes only.
            </span>
          </label>

          <label className="flex flex-col gap-y-1">
            <span>Transport *</span>
            <select
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
              className="bg-theme-bg-primary rounded px-3 py-2 outline-none"
            >
              <option value="stdio">stdio (local command)</option>
              <option value="sse">sse (remote URL)</option>
              <option value="streamable">streamable (remote URL)</option>
              {/* <option value="http">http (remote URL)</option> Redundant alias for `streamable` — backend treats both as StreamableHTTPClientTransport (server/utils/MCP/hypervisor/index.js:471). */}
            </select>
          </label>

          {transport === "stdio" ? (
            <>
              <label className="flex flex-col gap-y-1">
                <span>Command *</span>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="e.g. npx"
                  className="bg-theme-bg-primary rounded px-3 py-2 outline-none"
                />
              </label>
              <label className="flex flex-col gap-y-1">
                <span>Arguments (JSON array)</span>
                <textarea
                  value={argsText}
                  onChange={(e) => setArgsText(e.target.value)}
                  placeholder='["-y", "@modelcontextprotocol/server-filesystem", "/app/server/storage"]'
                  rows={3}
                  className="bg-theme-bg-primary rounded px-3 py-2 outline-none font-mono text-xs"
                />
              </label>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-y-1">
                <span>URL *</span>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/mcp"
                  className="bg-theme-bg-primary rounded px-3 py-2 outline-none"
                />
              </label>
              <label className="flex flex-col gap-y-1">
                <span>Headers (JSON object, optional)</span>
                <textarea
                  value={headersText}
                  onChange={(e) => setHeadersText(e.target.value)}
                  placeholder='{"Authorization": "Bearer ..."}'
                  rows={2}
                  className="bg-theme-bg-primary rounded px-3 py-2 outline-none font-mono text-xs"
                />
              </label>
            </>
          )}

          <label className="flex flex-col gap-y-1">
            <span>Environment variables (JSON object, optional)</span>
            <textarea
              value={envText}
              onChange={(e) => setEnvText(e.target.value)}
              placeholder='{"API_KEY": "..."}'
              rows={2}
              className="bg-theme-bg-primary rounded px-3 py-2 outline-none font-mono text-xs"
            />
          </label>

          <label className="flex items-center gap-x-2">
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
            />
            <span>Auto-start on application boot</span>
          </label>

          <div className="flex items-center justify-end gap-x-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-white/20 text-theme-text-secondary hover:text-white"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 rounded bg-cta-button text-black font-medium disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? "Adding..." : "Add server"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MCPServersList({
  isLoading = false,
  servers = [],
  selectedServer,
  handleClick,
}) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="text-theme-text-secondary text-center text-xs flex flex-col gap-y-2">
        <p>{t("agent.mcp.loading-from-config")}...</p>
        <a
          href="https://docs.anythingllm.com/mcp-compatibility/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-theme-text-secondary underline hover:text-cta-button"
        >
          {t("agent.mcp.learn-more")}
        </a>
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="text-theme-text-secondary text-center text-xs flex flex-col gap-y-2">
        <p>{t("agent.mcp.no-servers-found")}</p>
        <a
          href="https://docs.anythingllm.com/mcp-compatibility/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-theme-text-secondary underline hover:text-cta-button"
        >
          {t("agent.mcp.learn-more")}
        </a>
      </div>
    );
  }

  return (
    <div className="bg-theme-bg-secondary text-white rounded-xl w-full md:min-w-[360px]">
      {servers.map((server, index) => (
        <MCPServerItem
          key={server.name}
          server={server}
          isFirst={index === 0}
          isLast={index === servers.length - 1}
          isSelected={selectedServer?.name === server.name}
          handleClick={() => handleClick?.(server)}
        />
      ))}
      <Tooltip
        id="mcp-server-warning"
        place="bottom"
        delayShow={300}
        className="tooltip !text-xs"
        content={t("agent.mcp.tool-warning")}
      />
    </div>
  );
}

function MCPServerItem({ server, isFirst, isLast, isSelected, handleClick }) {
  const { t } = useTranslation();
  const suppressedTools = server.config?.anythingllm?.suppressedTools || [];
  const enabledToolCount = server.tools.length - suppressedTools.length;
  const showWarning = enabledToolCount > 10;
  const running = server.running;

  return (
    <div
      className={`py-3 px-4 flex items-center justify-between ${
        isFirst ? "rounded-t-xl" : ""
      } ${
        isLast ? "rounded-b-xl" : "border-b border-white/10"
      } cursor-pointer transition-all duration-300 hover:bg-theme-bg-primary ${
        isSelected ? "bg-white/10 light:bg-theme-bg-sidebar" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-x-2 text-sm font-light">
        {showWarning && (
          <Warning
            data-tooltip-id="mcp-server-warning"
            className="h-4 w-4 text-yellow-500"
          />
        )}
        {titleCase(server.name.replace(/[_-]/g, " "))}
      </div>
      <div className="flex items-center gap-x-2">
        <div
          className={`text-sm text-theme-text-secondary font-medium ${running ? "text-green-500" : "text-red-500"}`}
        >
          {running ? t("common.on") : t("common.stopped")}
        </div>
      </div>
    </div>
  );
}
