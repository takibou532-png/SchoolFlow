import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Settings from './pages/Settings/Settings';
import Student from './pages/Students/Student';
import Modules from './pages/Modules/Modules';
import SubjectsClassrooms from './pages/Settings/SubjectsClassrooms';
import Teachers from './pages/Teachers/Teachers';
import Expenses from './pages/Expenses/Expenses';
import Financials from './pages/Financials/Financials';
import Attendance from './pages/Attendance/Attendance';
import Courses from './pages/Courses/Courses';
import Employees from './pages/Employees/Employees';
import JobApplications from './pages/JobApplications/JobApplications';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="students" element={<Student />} />
          <Route path="modules" element={<Modules />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="financials" element={<Financials />} />
          <Route path="courses" element={<Courses />} />
          <Route path="employees" element={<Employees />} />
          <Route path="job-applications" element={<JobApplications />} />
          <Route path="subjects-classrooms" element={<SubjectsClassrooms />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}