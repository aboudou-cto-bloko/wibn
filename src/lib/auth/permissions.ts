import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

export const statement = {
  ...defaultStatements,
  idea: ["view", "generate", "export", "api_access"],
  cluster: ["view", "create", "export"],
  painPoint: ["view", "scrape", "export"],
  analytics: ["view", "export"],
  settings: ["view", "update"],
} as const;

export const ac = createAccessControl(statement);

// FREE Plan (3 idées/mois)
export const free = ac.newRole({
  idea: ["view", "generate"],
  cluster: ["view"],
  painPoint: ["view"],
  analytics: ["view"],
  settings: ["view"],
});

// PRO Plan ($29/mois - illimité)
export const pro = ac.newRole({
  idea: ["view", "generate", "export"],
  cluster: ["view", "export"],
  painPoint: ["view", "export"],
  analytics: ["view", "export"],
  settings: ["view", "update"],
});

// AGENCY Plan ($99/mois - multi-users + API)
export const agency = ac.newRole({
  idea: ["view", "generate", "export", "api_access"],
  cluster: ["view", "create", "export"],
  painPoint: ["view", "scrape", "export"],
  analytics: ["view", "export"],
  settings: ["view", "update"],
});

// ENTERPRISE Plan (custom - tout)
export const enterprise = ac.newRole({
  idea: ["view", "generate", "export", "api_access"],
  cluster: ["view", "create", "export"],
  painPoint: ["view", "scrape", "export"],
  analytics: ["view", "export"],
  settings: ["view", "update"],
});

export const admin = ac.newRole({
  ...adminAc.statements,
  idea: ["view", "generate", "export", "api_access"],
  cluster: ["view", "create", "export"],
  painPoint: ["view", "scrape", "export"],
  analytics: ["view", "export"],
  settings: ["view", "update"],
});
