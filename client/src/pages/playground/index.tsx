import { SessionControls } from "@/components/layout/session-controls";
import { MonacoEditor } from "@/components/editor/monaco-editor";
import { FileExplorer } from "@/components/editor/file-explorer";
import { CollaborationPanel } from "@/components/editor/collaboration-panel";
import {
  AuthRequiredView,
  CollaborationRequiredView,
  ErrorView,
  LoadingView,
  FileTabs,
  MobileControls,
} from "./components";
import { usePlayground } from "./use-playground";

export default function PlaygroundPage() {
  const {
    sessionId,
    sessionData,
    isLoading,
    error,
    accessError,
    activeFile,
    activeFileId,
    openFiles,
    showSidebar,
    showCollaborationPanel,
    executionResult,
    isRunning,
    enhancedParticipants,
    setShowSidebar,
    setShowCollaborationPanel,
    handleFileSelect,
    handleSelectFileTab,
    handleCloseFileTab,
    handleCodeChange,
    handleLanguageChange,
    handleExecute,
    runCode,
    sendCollaborationRequest,
    refetch,
  } = usePlayground();

  const navigateToDashboard = () => {
    window.location.href = "/";
  };

  // Loading state
  if (isLoading) {
    return <LoadingView />;
  }

  // Auth required
  if (accessError?.requiresAuth) {
    return <AuthRequiredView onReturn={navigateToDashboard} />;
  }

  // Collaboration required
  if (accessError?.requiresRequest) {
    return (
      <CollaborationRequiredView
        onRequestAccess={sendCollaborationRequest}
        onReturn={navigateToDashboard}
      />
    );
  }

  // Error state
  if (error || !sessionData) {
    return (
      <ErrorView
        message={
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
        }
        onReturn={navigateToDashboard}
      />
    );
  }

  return (
    <div className="min-h-svh flex flex-col bg-background">
      {/* Session Controls */}
      <SessionControls
        sessionId={sessionData.session.id}
        sessionName={sessionData.session.name}
        language={sessionData.session.language}
        onLanguageChange={handleLanguageChange}
        activeFile={activeFile}
        onExecute={handleExecute}
        isRunning={isRunning}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (File Explorer) */}
        <div
          className={`w-56 bg-card border-r border-border flex-shrink-0 overflow-auto ${
            showSidebar ? "block" : "hidden"
          } md:block`}
        >
          <FileExplorer
            files={sessionData.files}
            activeFileId={activeFileId || ""}
            sessionId={sessionData.session.id}
            onFileSelect={handleFileSelect}
            onFileUpdated={() => refetch()}
          />
        </div>

        {/* Editor Panel */}
        <div className="flex-grow flex flex-col bg-background overflow-hidden">
          {/* File tabs */}
          <FileTabs
            files={openFiles}
            activeFileId={activeFileId}
            onSelect={handleSelectFileTab}
            onClose={handleCloseFileTab}
          />

          {/* Code editor */}
          <div className="flex-grow relative overflow-hidden">
            {activeFile ? (
              <MonacoEditor
                value={activeFile.content}
                language={sessionData.session.language}
                fileId={activeFile.id}
                onChange={handleCodeChange}
                participants={enhancedParticipants}
              />
            ) : (
              <div className="p-4 text-muted-foreground">
                No file selected. Create or select a file to start coding.
              </div>
            )}
          </div>
        </div>

        {/* Collaboration Panel */}
        {showCollaborationPanel && (
          <CollaborationPanel
            sessionId={sessionData.session.id}
            participants={enhancedParticipants}
            executionResult={executionResult}
          />
        )}
      </div>

      {/* Mobile controls */}
      <MobileControls
        showSidebar={showSidebar}
        showCollaborationPanel={showCollaborationPanel}
        isRunning={isRunning}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onToggleCollaborationPanel={() =>
          setShowCollaborationPanel(!showCollaborationPanel)
        }
        onRunCode={runCode}
      />
    </div>
  );
}
