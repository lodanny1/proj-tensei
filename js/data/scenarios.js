// === Scenario: EKS → RDS Connection Failure ===
// A realistic investigation where the AI agent diagnoses a security group
// misconfiguration blocking EKS pods from reaching RDS Aurora on TCP/5432.

export const EKS_RDS_SCENARIO = {
  id: 'eks-rds',
  caseId: 'eks-rds',
  name: 'EKS → RDS Connection Failure',
  steps: [
    // --- Phase 1: Detection & Initial Analysis ---
    {
      delay: 1500,
      action: 'timeline',
      data: {
        actor: 'AI Agent',
        text: '🔍 Starting investigation. Analyzing connection between EKS pods and RDS Aurora...',
        type: 'agent',
        time: '0:02'
      }
    },
    {
      delay: 2000,
      action: 'logs',
      data: [
        { text: '[INFO] Agent initialized — scanning network path: eks-pod-app → rds-primary', level: 'info' },
        { text: '[INFO] Checking security groups, NACLs, and route tables...', level: 'info' },
      ]
    },
    {
      delay: 2500,
      action: 'timeline',
      data: {
        actor: 'AI Agent',
        text: '📡 Checking CloudWatch metrics for connection errors...',
        type: 'agent',
        detail: 'Metric: DatabaseConnections = 0 (last 10 min)',
        time: '0:05'
      }
    },
    {
      delay: 2000,
      action: 'logs',
      data: [
        { text: '[WARN] CloudWatch: DatabaseConnections dropped to 0 at 14:23 UTC', level: 'warn' },
        { text: '[WARN] CloudWatch: NetworkReceiveThroughput = 0 bytes/sec on rds-primary', level: 'warn' },
        { text: '[ERROR] EKS pod logs: dial tcp 10.0.3.42:5432: i/o timeout', level: 'error' },
      ]
    },

    // --- Phase 2: Error markers on topology ---
    {
      delay: 2000,
      action: 'errorEdge',
      data: {
        fromId: 'eks-pod-app',
        toId: 'rds-primary',
        error: {
          title: 'Connection Timeout',
          logs: [
            'dial tcp 10.0.3.42:5432: i/o timeout',
            'pq: could not connect to server: connection refused'
          ],
          metric: 'DatabaseConnections: 0 (was 47)',
          suggestion: 'Security group or NACL blocking TCP/5432'
        }
      }
    },
    {
      delay: 1500,
      action: 'errorNode',
      data: {
        nodeId: 'rds-primary',
        error: {
          title: 'No Inbound Connections',
          logs: [
            'ActiveConnections: 0',
            'Last successful connection: 14:22:58 UTC'
          ],
          metric: 'FreeableMemory: 6.2 GiB (normal) — instance healthy',
          suggestion: 'Instance is healthy but unreachable — likely network-level block'
        }
      }
    },
    {
      delay: 2000,
      action: 'timeline',
      data: {
        actor: 'AI Agent',
        text: '⚠️ Found connection timeout between EKS pods and RDS. Instance is healthy but unreachable.',
        type: 'agent',
        detail: 'TCP/5432 blocked — checking security group rules...',
        time: '0:11'
      }
    },

    // --- Phase 3: Root cause identification ---
    {
      delay: 3000,
      action: 'logs',
      data: [
        { text: '[INFO] Inspecting sg-rds-prod inbound rules...', level: 'info' },
        { text: '[INFO] Rule count: 2 inbound, 1 outbound', level: 'info' },
        { text: '[ERROR] MISSING: No inbound rule for TCP/5432 from sg-eks-nodes (sg-0abc123)', level: 'error' },
        { text: '[INFO] Found rule: TCP/3306 from sg-eks-nodes — wrong port (MySQL not PostgreSQL)', level: 'info' },
        { text: '[INFO] Last SG modification: 2 hours ago by arn:aws:iam::123456789:user/deploy-bot', level: 'info' },
      ]
    },
    {
      delay: 2000,
      action: 'timeline',
      data: {
        actor: 'AI Agent',
        text: '🎯 <strong>Root cause identified:</strong> Security group sg-rds-prod is missing inbound TCP/5432 from EKS nodes. A recent change replaced port 5432 with 3306 (MySQL port).',
        type: 'system',
        detail: 'Modified 2 hours ago by deploy-bot — likely a misconfigured IaC template',
        time: '0:15'
      }
    },

    // --- Phase 4: Proposed fix + Approval ---
    {
      delay: 2500,
      action: 'timeline',
      data: {
        actor: 'AI Agent',
        text: '🔧 Proposed fix: Add inbound rule <code>TCP/5432</code> from <code>sg-eks-nodes</code> to <code>sg-rds-prod</code>, and remove incorrect TCP/3306 rule.',
        type: 'agent',
        detail: 'Confidence: 94% — this matches the exact failure pattern',
        time: '0:17'
      }
    },
    {
      delay: 1500,
      action: 'chatMessage',
      data: {
        actor: 'AI Agent',
        text: 'I\'ve identified the root cause. Security group <strong>sg-rds-prod</strong> has TCP/3306 (MySQL) instead of TCP/5432 (PostgreSQL) from the EKS nodes. This was changed 2 hours ago by deploy-bot.',
        type: 'agent'
      }
    },
    {
      delay: 1000,
      action: 'approval',
      data: {
        message: 'Modify security group <strong>sg-rds-prod</strong>: Add inbound TCP/5432 from sg-eks-nodes, remove incorrect TCP/3306 rule.',
        onApproveTimeline: {
          actor: 'Customer',
          text: '✅ Approved security group modification.',
          type: 'system',
          time: ''
        },
        onDenyTimeline: {
          actor: 'Customer',
          text: '❌ Denied. Agent pausing — awaiting manual review.',
          type: 'system',
          time: ''
        }
      }
    },

    // --- Phase 5: Remediation ---
    {
      delay: 2000,
      action: 'timeline',
      data: {
        actor: 'AI Agent',
        text: '⚙️ Applying fix... Modifying sg-rds-prod inbound rules.',
        type: 'agent',
        time: '0:20'
      }
    },
    {
      delay: 2500,
      action: 'logs',
      data: [
        { text: '[INFO] Revoking: sg-rds-prod inbound TCP/3306 from sg-eks-nodes', level: 'info' },
        { text: '[INFO] Authorizing: sg-rds-prod inbound TCP/5432 from sg-eks-nodes', level: 'info' },
        { text: '[OK] Security group updated successfully', level: 'info' },
        { text: '[INFO] Waiting 10s for rule propagation...', level: 'info' },
      ]
    },

    // --- Phase 6: Verification ---
    {
      delay: 3000,
      action: 'logs',
      data: [
        { text: '[INFO] Testing connectivity: eks-pod-app → rds-primary:5432', level: 'info' },
        { text: '[OK] TCP handshake successful (23ms)', level: 'info' },
        { text: '[OK] PostgreSQL authentication successful', level: 'info' },
        { text: '[OK] SELECT 1 — query returned successfully', level: 'info' },
      ]
    },
    {
      delay: 1500,
      action: 'removeErrorEdge',
      data: { fromId: 'eks-pod-app', toId: 'rds-primary' }
    },
    {
      delay: 500,
      action: 'removeErrorNode',
      data: { nodeId: 'rds-primary' }
    },
    {
      delay: 2000,
      action: 'timeline',
      data: {
        actor: 'AI Agent',
        text: '✅ <strong>Issue resolved.</strong> EKS pods are now connected to RDS Aurora. DatabaseConnections metric recovering.',
        type: 'resolution',
        detail: 'Fix: Corrected security group rule (TCP/3306 → TCP/5432). Root cause: misconfigured IaC deploy.',
        time: '0:28'
      }
    },
    {
      delay: 1500,
      action: 'logs',
      data: [
        { text: '[OK] DatabaseConnections: 12 (recovering)', level: 'info' },
        { text: '[OK] NetworkReceiveThroughput: 2.4 MB/sec (normal)', level: 'info' },
        { text: '[INFO] Investigation complete. Case ready to resolve.', level: 'info' },
      ]
    },
  ]
};
