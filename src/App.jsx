import { Routes, Route } from 'react-router-dom'
import useContentProtection from './components/Usecontentprotection'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './components/MainLayout'
import ConsoleLayout from './components/ConsoleLayout'

//TollFee
import TollFeeRegister from './Pages/TollFee/Register'

// Public & Portal
import Landing from './Pages/Public/Landing'
import Talents from './Pages/Public/Talents'
import About from './Pages/Public/About'
import Support from './Pages/Public/Support'
import Portal from './Pages/Portal'
import LegalCenter from './Pages/LegalCenter'

// SEWORK
import SeworkLanding from './Pages/SEWORK/Landing'
import Login from './Pages/SEWORK/Login'
import ForgotPassword from './Pages/SEWORK/ForgotPassword'
import NewPassword from './Pages/SEWORK/NewPassword'

// SEWORK Console
import Dashboard from './Pages/SEWORK/Console/Dashboard'
import Announcements from './Pages/SEWORK/Console/Announcements'
import Assignments from './Pages/SEWORK/Console/Assignments'
import Subjects from './Pages/SEWORK/Console/Subjects'
import Schedules from './Pages/SEWORK/Console/Schedules'
import SheetData from './Pages/SEWORK/Console/SheetData'
import Semesters from './Pages/SEWORK/Console/Semesters'
import SubmissionLinks from './Pages/SEWORK/Console/SubmissionLinks'
import ResourceCenter from './Pages/SEWORK/Console/ResourceCenter'
import SubmissionTracking from './Pages/SEWORK/Console/SubmissionTracking'
import Leaderboard from './Pages/SEWORK/Console/Leaderboard'
import UsersManagement from './Pages/SEWORK/Console/UsersManagement'
import Contacts from './Pages/SEWORK/Console/Contacts'
import InternalLinks from './Pages/SEWORK/Console/InternalLinks'
import Profile from './Pages/SEWORK/Console/Profile'

// CLOUDFILES
import CloudFilesLanding from './Pages/Public/CloudFiles/CloudFilesLanding'
import CloudFilesDashboard from './Pages/Public/CloudFiles/Dashboard'

// CODING STUDIO
import CodingLanding from './Pages/Public/IDE/CodingLanding'
import CodingWorkspace from './Pages/Public/IDE/CodingWorkspace'

const Placeholder = ({ title }) => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] p-4 text-center text-white">
    <div className="rounded-[32px] border border-[#2c2c2e] bg-[#141414] p-12 shadow-2xl">
      <h1 className="mb-3 text-3xl font-bold">{title}</h1>
      <p className="text-gray-400">
        โมดูลนี้อยู่ระหว่างการพัฒนา (Coming Soon)
      </p>
    </div>
  </div>
)

// 404 page
const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 text-center">
    <div>
      <h1 className="mb-2 text-6xl font-black text-gray-900">404</h1>
      <p className="font-medium text-gray-500">
        ไม่พบหน้าที่คุณต้องการ
      </p>
    </div>
  </div>
)

export default function App() {
  useContentProtection()

  return (
    <Routes>
      {/* Public Website */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/talents" element={<Talents />} />
        <Route path="/about" element={<About />} />
        <Route path="/support" element={<Support />} />
        <Route path="/portal" element={<Portal />} />
        <Route path="/legal-center" element={<LegalCenter />} />
      </Route>

      {/*TollFee*/}
      <Route path="/tollfee/register" element={<TollFeeRegister />} />

      {/* SEWORK - Public Routes */}
      <Route path="/sework/landing" element={<SeworkLanding />} />
      <Route path="/sework/login" element={<Login />} />
      <Route
        path="/sework/forgot-password"
        element={<ForgotPassword />}
      />
      <Route
        path="/sework/new-password"
        element={<NewPassword />}
      />

      {/* SEWORK - Protected Console Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<ConsoleLayout />}>
          <Route
            path="/sework/se-console/dashboard"
            element={<Dashboard />}
          />
          <Route
            path="/sework/se-console/announcements"
            element={<Announcements />}
          />
          <Route
            path="/sework/se-console/assignments"
            element={<Assignments />}
          />
          <Route
            path="/sework/se-console/subjects"
            element={<Subjects />}
          />
          <Route
            path="/sework/se-console/schedules"
            element={<Schedules />}
          />
          <Route
            path="/sework/se-console/sheet-data"
            element={<SheetData />}
          />
          <Route
            path="/sework/se-console/semesters"
            element={<Semesters />}
          />
          <Route
            path="/sework/se-console/submission-links"
            element={<SubmissionLinks />}
          />
          <Route
            path="/sework/se-console/resource-center"
            element={<ResourceCenter />}
          />
          <Route
            path="/sework/se-console/submission-tracking"
            element={<SubmissionTracking />}
          />
          <Route
            path="/sework/se-console/leaderboard"
            element={<Leaderboard />}
          />
          <Route
            path="/sework/se-console/users-management"
            element={<UsersManagement />}
          />
          <Route
            path="/sework/se-console/contacts"
            element={<Contacts />}
          />
          <Route
            path="/sework/se-console/internal-links"
            element={<InternalLinks />}
          />
          <Route
            path="/sework/se-console/profile"
            element={<Profile />}
          />
        </Route>
      </Route>

      {/* CLOUDFILES - Public Routes */}
      <Route
        path="/cloudfiles/login"
        element={<CloudFilesLanding />}
      />
      <Route
        path="/cloudfiles/landing"
        element={<CloudFilesLanding />}
      />

      {/* CLOUDFILES - Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/cloudfiles/dashboard"
          element={<CloudFilesDashboard />}
        />
        <Route
          path="/cloudfiles/folder/:folderId"
          element={<Placeholder title="CLOUDFILES Folder View" />}
        />
      </Route>

      {/* CODING STUDIO - Public Routes */}
      <Route
        path="/coding/login"
        element={<CodingLanding />}
      />
      <Route
        path="/coding/landing"
        element={<CodingLanding />}
      />

      {/* CODING STUDIO - Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/coding/workspace"
          element={<Placeholder title="CODING Workspace (Global)" />}
        />
        <Route
          path="/coding/workspace/:username"
          element={<CodingWorkspace />}
        />
      </Route>

      {/* 404 - Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}