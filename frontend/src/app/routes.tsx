import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/Auth/LoginPage';
import { RoleChooserPage } from '../pages/Landing/RoleChooserPage';
import { AmbulanceHomePage } from '../pages/Ambulance/AmbulanceHomePage';
import { ActiveCasePage } from '../pages/Ambulance/ActiveCasePage';
import { MassCasualtyPage } from '../pages/Ambulance/MassCasualtyPage';
import { HospitalPickerPage } from '../pages/Hospital/HospitalPickerPage';
import { HospitalConsolePage } from '../pages/Hospital/HospitalConsolePage';
import { EnhancedAdminDashboardPage } from '../pages/Admin/EnhancedAdminDashboardPage';
import { ManageHospitalsPage } from '../pages/Admin/ManageHospitalsPage';
import { ManageAmbulancesPage } from '../pages/Admin/ManageAmbulancesPage';
import { AuditLogPage } from '../pages/Admin/AuditLogPage';
import { FamilyTrackPage } from '../pages/Track/FamilyTrackPage';
import { HospitalRegistrationPage } from '../pages/Registration/HospitalRegistrationPage';
import { AmbulanceRegistrationPage } from '../pages/Registration/AmbulanceRegistrationPage';
import { ComponentGalleryPage } from '../pages/Dev/ComponentGalleryPage';
import { RoleGuard } from '../components/layout/RoleGuard';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/roles" element={<RoleChooserPage />} />

      {/* Ambulance Dispatch Portal */}
      <Route
        path="/ambulance"
        element={
          <RoleGuard allowedRoles={['ambulance', 'admin']}>
            <AmbulanceHomePage />
          </RoleGuard>
        }
      />
      <Route
        path="/ambulance/mass-casualty"
        element={
          <RoleGuard allowedRoles={['ambulance', 'admin']}>
            <MassCasualtyPage />
          </RoleGuard>
        }
      />
      <Route
        path="/ambulance/:caseId"
        element={
          <RoleGuard allowedRoles={['ambulance', 'admin']}>
            <ActiveCasePage />
          </RoleGuard>
        }
      />

      {/* Coordinator Emergency Portal (formerly Hospital ER Bay) */}
      <Route
        path="/coordinator"
        element={
          <RoleGuard allowedRoles={['coordinator', 'hospital', 'admin']}>
            <HospitalConsolePage />
          </RoleGuard>
        }
      />
      <Route
        path="/hospital"
        element={
          <RoleGuard allowedRoles={['coordinator', 'hospital', 'admin']}>
            <HospitalConsolePage />
          </RoleGuard>
        }
      />
      <Route
        path="/hospital/:hospitalId"
        element={
          <RoleGuard allowedRoles={['coordinator', 'hospital', 'admin']}>
            <HospitalConsolePage />
          </RoleGuard>
        }
      />

      {/* Regional Command Admin Oversight & Management */}
      <Route
        path="/admin"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <EnhancedAdminDashboardPage />
          </RoleGuard>
        }
      />
      <Route
        path="/admin/hospitals"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <ManageHospitalsPage />
          </RoleGuard>
        }
      />
      <Route
        path="/admin/ambulances"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <ManageAmbulancesPage />
          </RoleGuard>
        }
      />
      <Route
        path="/admin/audit-log"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <AuditLogPage />
          </RoleGuard>
        }
      />

      {/* Public / Unrestricted Flows */}
      <Route path="/register/hospital" element={<HospitalRegistrationPage />} />
      <Route path="/register/ambulance" element={<AmbulanceRegistrationPage />} />
      <Route path="/track/:caseId" element={<FamilyTrackPage />} />
      <Route path="/dev/components" element={<ComponentGalleryPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
