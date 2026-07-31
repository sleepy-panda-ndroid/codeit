Fixed 3-dot dropdown menu (trigger issue with custom button)

Implemented owner actions (rename, delete, visibility toggle)

Re-implemented the manage member option

Added action feedback (success/error messages on project card)

Designed and implemented invite-based collaboration system

ProjectAccess.status = PENDING | ACCEPTED

replaced direct sharing with invitations

Built notification system (backend)

created Notification model

invite → notification

accept/decline → delete notification

Added notification APIs

list notifications

count for bell badge

accept/decline routes

Built Notifications page (frontend)

list invites

accept/decline actions

connected to backend

Connected notification bell

shows count

navigates to notifications page

Upgraded Collaboration page

separated Accepted Members and Pending Invitations
updated UI wording to invitation-based flow
Fixed READER permission bug
made editor truly read-only
blocked typing + Tab + draft persistence
Replaced editor with Monaco Editor
Cleaned terminal panel
removed fake logs
replaced with placeholder message

backend:
cd backend
npm install
npm run dev
frontend:
cd frontend
npm install
npm run dev