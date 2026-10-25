# Spec: frontend/routing

## Purpose
Define the client-side route map for the StockFlow SPA and the rules governing authenticated vs unauthenticated access, including an application-level error boundary.

## Requirements

### Requirement: Route definitions
The application SHALL define exactly four client-side routes using React Router `BrowserRouter`: `/` renders `Login`; `/register` renders `Register`; `/forgot-password` renders `ForgotPassword`; `/dashboard` renders `Dashboard` wrapped in `ProtectedRoute`. Both `darkMode` (boolean) and `setDarkMode` (setter) SHALL be passed as props to every page component.

#### Scenario: Root route renders Login
- **WHEN** the user navigates to `/`
- **THEN** the `Login` component renders with `darkMode` and `setDarkMode` props

#### Scenario: Register route renders Register
- **WHEN** the user navigates to `/register`
- **THEN** the `Register` component renders

### Requirement: Protected route
`ProtectedRoute` SHALL read `user` from `AuthContext`. If `user` is truthy the children are rendered as-is. If `user` is falsy the component SHALL redirect to `/` using `<Navigate replace />`. No redirect SHALL be performed for unauthenticated users accessing `/`, `/register`, or `/forgot-password`.

#### Scenario: Unauthenticated access to dashboard
- **WHEN** a user navigates to `/dashboard` and `user` is null in `AuthContext`
- **THEN** the browser is redirected to `/` without adding `/dashboard` to history

#### Scenario: Authenticated user accesses dashboard
- **WHEN** a user navigates to `/dashboard` and `user` is non-null
- **THEN** `Dashboard` renders normally

### Requirement: Dark-mode state persistence
The root `App` component SHALL initialize `darkMode` from `localStorage.getItem('theme') === 'dark'`. On every change it SHALL add the class `dark` to `document.documentElement` when `darkMode` is true; remove it when false; and write `'dark'` or `'light'` to `localStorage` key `'theme'`.

#### Scenario: User previously chose dark mode
- **WHEN** the page loads and `localStorage.theme === 'dark'`
- **THEN** `darkMode` initialises to `true` and `document.documentElement` has class `dark`

#### Scenario: User switches to light mode
- **WHEN** `darkMode` changes from `true` to `false`
- **THEN** the `dark` class is removed from `<html>` and `localStorage.theme` becomes `'light'`

### Requirement: Error boundary
An `ErrorBoundary` class component SHALL wrap the entire application.

#### Scenario: Runtime render error
- **WHEN** any child component throws an unhandled error during rendering
- **THEN** the boundary SHALL display a full-viewport centred error screen with the text "Algo deu errado", a description asking the user to reload, and a purple "Recarregar" button that calls `window.location.reload()`

### Requirement: Global social links
The `SocialLinks` component SHALL be rendered outside the `<Routes>` tree so it appears on every page.

#### Scenario: Social links on login page
- **WHEN** the user is on the Login page
- **THEN** the `SocialLinks` component is visible

#### Scenario: Social links on dashboard
- **WHEN** the user is on the Dashboard page
- **THEN** the `SocialLinks` component is visible

### Requirement: Auth provider scope
`AuthProvider` SHALL wrap `BrowserRouter` so that all route components can access the auth context.

#### Scenario: Dashboard reads auth context
- **WHEN** the Dashboard renders inside `BrowserRouter`
- **THEN** it can call `useAuth()` and receive the current user
