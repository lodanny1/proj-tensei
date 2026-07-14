// === ScenarioEngine Class ===
// Plays investigation scenarios step-by-step with configurable delays.
// Each step can: add timeline messages, show approvals, add logs,
// trigger error markers on the topology, or wait for user action.

export class ScenarioEngine {
  constructor({ workspace, errorMarkers, switchView }) {
    this.workspace = workspace;
    this.errorMarkers = errorMarkers;
    this.switchView = switchView;
    this.scenario = null;
    this.stepIndex = 0;
    this.running = false;
    this.paused = false;
    this.timeouts = [];
  }

  // Load and start a scenario
  play(scenario) {
    this.stop();
    this.scenario = scenario;
    this.stepIndex = 0;
    this.running = true;
    this.paused = false;
    this._runNext();
  }

  // Stop the current scenario
  stop() {
    this.running = false;
    this.paused = false;
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts = [];
  }

  // Pause playback (keeps state, can resume)
  pause() {
    this.paused = true;
  }

  // Resume from paused state
  resume() {
    if (this.paused) {
      this.paused = false;
      this._runNext();
    }
  }

  // Run the next step in the scenario
  _runNext() {
    if (!this.running || this.paused) return;
    if (this.stepIndex >= this.scenario.steps.length) {
      this.running = false;
      return;
    }

    const step = this.scenario.steps[this.stepIndex];
    const delay = step.delay || 0;

    const tid = setTimeout(() => {
      if (!this.running || this.paused) return;
      this._executeStep(step);
    }, delay);

    this.timeouts.push(tid);
  }

  // Execute a single step based on its action type
  _executeStep(step) {
    switch (step.action) {
      case 'timeline':
        this.workspace.addTimelineMessage(step.data);
        this._advance();
        break;

      case 'log':
        this.workspace.addLog(step.data.text, step.data.level);
        this._advance();
        break;

      case 'logs': // Batch multiple log lines
        step.data.forEach(line => {
          this.workspace.addLog(line.text, line.level);
        });
        this._advance();
        break;

      case 'errorNode':
        this.errorMarkers.addNodeError(step.data.nodeId, step.data.error);
        this._advance();
        break;

      case 'errorEdge':
        this.errorMarkers.addEdgeError(step.data.fromId, step.data.toId, step.data.error);
        this._advance();
        break;

      case 'removeErrorNode':
        this.errorMarkers.removeNodeError(step.data.nodeId);
        this._advance();
        break;

      case 'removeErrorEdge':
        this.errorMarkers.removeEdgeError(step.data.fromId, step.data.toId);
        this._advance();
        break;

      case 'clearErrors':
        this.errorMarkers.clearAll();
        this._advance();
        break;

      case 'chatMessage':
        this.workspace.addChatMessage(step.data);
        this._advance();
        break;

      case 'approval':
        this.workspace.showChatApproval(step.data.message, () => {
          // On approve — continue to next step
          if (step.data.onApproveTimeline) {
            this.workspace.addTimelineMessage(step.data.onApproveTimeline);
          }
          this._advance();
        }, () => {
          // On deny — jump to deny step or stop
          if (step.data.onDenyTimeline) {
            this.workspace.addTimelineMessage(step.data.onDenyTimeline);
          }
          if (step.data.denyJump !== undefined) {
            this.stepIndex = step.data.denyJump;
            this._runNext();
          } else {
            this.running = false;
          }
        });
        break;

      case 'switchView':
        this.switchView(step.data.view);
        this._advance();
        break;

      default:
        console.warn(`ScenarioEngine: unknown action "${step.action}"`);
        this._advance();
    }
  }

  // Move to the next step
  _advance() {
    this.stepIndex++;
    this._runNext();
  }
}
