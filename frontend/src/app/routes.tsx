import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/Auth/LoginPage';
import { RoleChooserPage } from '../pages/Landing/RoleChooserPage';
import { AmbulanceHomePage } from '../pages/Ambulance/AmbulanceHomePage';
import { ActiveCasePage } from '../pages/Ambulance/ActiveCasePage';
import { MassCasualtyPage } from '../pages/Ambulance/MassCasualtyPage';
import { HospitalPickerPage } from '../pages/Hospital/HospitalPickerPage';
import { HospitalConsolePage } from '../pages/Hospital/HospitalConsolePage';
import { AdminDashboardPage } from '../pages/Admin/AdminDashboardPage';
import { FamilyTrackPage } from '../pages/Track/FamilyTrackPage';
import { HospitalRegistrationPage } from '../pages/Registration/HospitalRegistrationPage';
import { AmbulanceRegistrationPage } from '../pages/Registration/AmbulanceRegistrationPage';
import { ComponentGalleryPage } from '../pages/Dev/ComponentGalleryPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/roles" element={<RoleChooserPage />} />
      <Route path="/ambulance" element={<AmbulanceHomePage />} />
      <Route path="/ambulance/mass-casualty" element={<MassCasualtyPage />} />
      <Route path="/ambulance/:caseId" element={<ActiveCasePage />} />
      <Route path="/hospital" element={<HospitalPickerPage />} />
      <Route path="/hospital/:hospitalId" element={<HospitalConsolePage />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/register/hospital" element={<HospitalRegistrationPage />} />
      <Route path="/register/ambulance" element={<AmbulanceRegistrationPage />} />
      <Route path="/track/:caseId" element={<FamilyTrackPage />} />
      <Route path="/dev/components" element={<ComponentGalleryPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
