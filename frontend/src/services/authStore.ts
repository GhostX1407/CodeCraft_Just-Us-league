export type UserRole = 'ambulance' | 'coordinator' | 'admin' | 'family' | 'hospital';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  badge: string;
  facilityOrUnit: string;
  redirectPath: string;
}

export interface DemoAccount {
  role: UserRole;
  title: string;
  subtitle: string;
  username: string;
  password: string;
  user: AuthUser;
}

export const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
  ambulance: {
    role: 'ambulance',
    title: 'Ambulance EMT',
    subtitle: 'Field Paramedic Dispatch',
    username: 'paramedic@raahi.health',
    password: 'ambulance2026',
    user: {
      id: 'usr_amb_04',
      username: 'paramedic@raahi.health',
      name: 'Officer Vikram Rathore',
      role: 'ambulance',
      badge: 'ALS Unit 04',
      facilityOrUnit: 'Ambulance Alpha-04 (Advanced Life Support)',
      redirectPath: '/ambulance',
    },
  },
  coordinator: {
    role: 'coordinator',
    title: 'Emergency Coordinator',
    subtitle: 'Cross-Hospital Intake & Allocation',
    username: 'coordinator@raahi.health',
    password: 'coordinator2026',
    user: {
      id: 'usr_coord_regional',
      username: 'coordinator@raahi.health',
      name: 'Dr. Ananya Sen',
      role: 'coordinator',
      badge: 'Regional Coordinator',
      facilityOrUnit: 'Cross-Hospital Emergency Command',
      redirectPath: '/coordinator',
    },
  },
  hospital: {
    role: 'coordinator',
    title: 'Emergency Coordinator',
    subtitle: 'Cross-Hospital Intake & Allocation',
    username: 'coordinator@raahi.health',
    password: 'coordinator2026',
    user: {
      id: 'usr_coord_regional',
      username: 'coordinator@raahi.health',
      name: 'Dr. Ananya Sen',
      role: 'coordinator',
      badge: 'Regional Coordinator',
      facilityOrUnit: 'Cross-Hospital Emergency Command',
      redirectPath: '/coordinator',
    },
  },
  admin: {
    role: 'admin',
    title: 'Regional Admin',
    subtitle: 'State Command & Radiance',
    username: 'director@ems.health.gov',
    password: 'director2026',
    user: {
      id: 'usr_admin_cmd',
      username: 'director@ems.health.gov',
      name: 'Director Rajesh Verma',
      role: 'admin',
      badge: 'State Oversight',
      facilityOrUnit: 'Regional Emergency Command Authority',
      redirectPath: '/admin',
    },
  },
  family: {
    role: 'family',
    title: 'Family Tracking',
    subtitle: 'Patient Guardian Portal',
    username: 'family-access@patient.in',
    password: 'patient2026',
    user: {
      id: 'usr_fam_1042',
      username: 'family-access@patient.in',
      name: 'Next-of-Kin Access',
      role: 'family',
      badge: 'Case R-1042',
      facilityOrUnit: 'Guardian of Patient R. Sharma',
      redirectPath: '/track/case_mc_01',
    },
  },
};

const STORAGE_KEY = 'raahi_auth_user';
type AuthListener = (user: AuthUser | null) => void;
const listeners = new Set<AuthListener>();

class AuthStore {
  private user: AuthUser | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.user = JSON.parse(stored);
        if (this.user && (this.user.role === 'hospital' as any)) {
          this.user.role = 'coordinator';
          this.user.redirectPath = '/coordinator';
          this.user.badge = 'Regional Coordinator';
          this.user.facilityOrUnit = 'Cross-Hospital Emergency Command';
        }
      }
    } catch {
      this.user = null;
    }
  }

  public getAuthUser(): AuthUser | null {
    return this.user;
  }

  public isAuthenticated(): boolean {
    return this.user !== null;
  }

  public login(username: string, _password: string, preferredRole?: UserRole): { success: boolean; user?: AuthUser; message?: string } {
    const trimmed = username.trim().toLowerCase();
    const effectiveRole = preferredRole === 'hospital' ? 'coordinator' : preferredRole;

    // Check against demo accounts
    for (const key of Object.keys(DEMO_ACCOUNTS)) {
      const demo = DEMO_ACCOUNTS[key];
      if (demo.username.toLowerCase() === trimmed || (effectiveRole && (demo.role === effectiveRole || key === effectiveRole))) {
        this.user = demo.user;
        this.persist();
        return { success: true, user: demo.user };
      }
    }

    // Fallback: create dynamic auth profile based on input role
    const assignedRole: UserRole = (preferredRole === 'hospital' ? 'coordinator' : preferredRole) || 'ambulance';
    const fallbackUser: AuthUser = {
      id: `usr_${Date.now()}`,
      username: trimmed || 'guest@raahi.health',
      name: trimmed ? trimmed.split('@')[0].toUpperCase() : 'Paramedic Crew',
      role: assignedRole,
      badge: assignedRole === 'ambulance' ? 'ALS Unit' : assignedRole === 'coordinator' ? 'Coordinator' : assignedRole === 'admin' ? 'Supervisor' : 'Family',
      facilityOrUnit: assignedRole === 'coordinator' ? 'Cross-Hospital Emergency Command' : 'Field Operations',
      redirectPath: DEMO_ACCOUNTS[assignedRole]?.user.redirectPath || '/coordinator',
    };

    this.user = fallbackUser;
    this.persist();
    return { success: true, user: fallbackUser };
  }

  public quickLogin(role: UserRole): AuthUser {
    const demo = DEMO_ACCOUNTS[role];
    this.user = demo.user;
    this.persist();
    return demo.user;
  }

  public logout() {
    this.user = null;
    localStorage.removeItem(STORAGE_KEY);
    this.notify();
  }

  public subscribe(listener: AuthListener): () => void {
    listeners.add(listener);
    listener(this.user);
    return () => {
      listeners.delete(listener);
    };
  }

  private persist() {
    if (this.user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.notify();
  }

  private notify() {
    listeners.forEach((fn) => fn(this.user));
  }
}

export const authStore = new AuthStore();
