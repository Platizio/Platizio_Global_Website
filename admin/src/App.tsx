import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth, RequireCapability } from './auth/RequireAuth'
import { AppShell } from './components/AppShell'
import { ToastProvider } from './components/Toast'
import { DEMO } from './lib/demo'
import { configError } from './lib/supabase'
import Calendar from './screens/Calendar'
import Dashboard from './screens/Dashboard'
import Enquiries from './screens/Enquiries'
import EnquiryDetail from './screens/EnquiryDetail'
import Login from './screens/Login'
import Outbox from './screens/Outbox'
import TicketDetail from './screens/TicketDetail'
import TicketQueue from './screens/TicketQueue'

/**
 * Routes.
 *
 * No lazy loading. This is a private console behind a login on its own
 * subdomain — nobody arrives here by accident, nobody is measuring its
 * Lighthouse score, and code-splitting would buy a smaller first paint at the
 * cost of a spinner every time an agent changes section. The marketing site's
 * bundle is untouched either way, which was the reason to split the apps.
 */

export default function App() {
  // A console with no project to talk to cannot show a login that could ever
  // succeed. Saying so plainly beats an endless "invalid credentials".
  // Demo mode is the one case that genuinely does not need a project.
  if (configError && !DEMO) {
    return (
      <div className="login">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-brand-mark" aria-hidden="true" />
            <div>
              <strong>Platizio Support</strong>
              <span>Console</span>
            </div>
          </div>
          <h1>Not configured</h1>
          <p className="login-lede">{configError}</p>
          <p className="login-foot">
            Both variables are set on the Vercel project for this subdomain. They are the same
            values the marketing site uses.
          </p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="tickets" element={<TicketQueue />} />
              <Route path="tickets/:id" element={<TicketDetail />} />
              <Route path="enquiries" element={<Enquiries />} />
              <Route path="enquiries/:id" element={<EnquiryDetail />} />
              <Route path="outbox" element={<Outbox />} />

              {/*
                Gated in the router as well as hidden from the nav, so pasting
                the URL does not render a screen whose every call will be
                refused. The server refuses regardless — require_admin() sits in
                front of all four of these RPCs.
              */}
              <Route
                path="calendar"
                element={
                  <RequireCapability capability="editCalendar">
                    <Calendar />
                  </RequireCapability>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
