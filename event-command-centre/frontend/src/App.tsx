import { Routes, Route } from "react-router-dom";
import { ConnectionBanner } from "./components/ConnectionBanner";
import { HomePage } from "./features/roles/HomePage";
import { EventLayout } from "./features/EventLayout";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { SetupPage } from "./features/setup/SetupPage";
import { RegistrationsPage } from "./features/registrations/RegistrationsPage";
import { OutreachPage } from "./features/outreach/OutreachPage";
import { PartnersPage } from "./features/partners/PartnersPage";
import { TasksPage } from "./features/tasks/TasksPage";
import { ContentPage } from "./features/content/ContentPage";
import { OperationsPage } from "./features/operations/OperationsPage";
import { RisksPage } from "./features/risks/RisksPage";
import { PlanPage } from "./features/plan/PlanPage";

export default function App() {
  return (
    <>
      <ConnectionBanner />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/events/:eventId" element={<EventLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="registrations" element={<RegistrationsPage />} />
          <Route path="outreach" element={<OutreachPage />} />
          <Route path="partners" element={<PartnersPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="content" element={<ContentPage />} />
          <Route path="operations" element={<OperationsPage />} />
          <Route path="risks" element={<RisksPage />} />
          <Route path="plan" element={<PlanPage />} />
        </Route>
      </Routes>
    </>
  );
}
