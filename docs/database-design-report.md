### 3.4 Database Design (ER Model)

The database schema for the Complaint Management System (CMS) was designed using MongoDB, a NoSQL document database, to ensure normalized data storage, efficient retrieval, and scalability. The design follows a document-oriented approach where related data is embedded or referenced as needed, balancing performance and data integrity. Key collections include Users, Complaints, Categories, Notifications, ActivityLogs, and Feedback. Below is a detailed description of each collection's schema, including fields, data types, relationships, and constraints.

#### 1. Users Collection

The Users collection stores information about all system users, including students, staff, HoD, Dean, and Admin. It supports role-based access control and user approval workflows.

**Schema Fields:**

- `name` (String, required): Full name of the user.
- `email` (String, required, unique): Email address for authentication and notifications.
- `password` (String, required): Hashed password for secure login.
- `role` (String, enum: ["student", "staff", "hod", "dean", "admin"], default: "student"): User's role in the system, normalized for consistency.
- `previousRole` (String, optional): Stores the role before promotion to admin for reversion.
- `previousDepartment` (String, optional): Preserves department before admin promotion.
- `previousWorkingPlace` (String, optional): Preserves working place before admin promotion.
- `isApproved` (Boolean, default: true for students/admins, false otherwise): Approval status.
- `isRejected` (Boolean, default: false): Rejection status.
- `department` (String, required for student/staff/hod): User's department.
- `workingPlace` (String, required for staff/hod/dean): User's working position.
- `phone` (String, optional): Contact phone number.
- `address` (String, optional): Physical address.
- `bio` (String, optional, max 500 chars): User biography.
- `isVerified` (Boolean, default: false): Email verification status.
- `approvedByDean` (Boolean, default: false): Intermediate approval for HoD by Dean.
- `isActive` (Boolean, default: true for students/admins, false otherwise): Account activation status.
- `avatarUrl` (String, optional): URL of user's profile picture.
- `avatarPublicId` (String, optional): Cloudinary public ID for avatar.
- `createdAt` (Date, auto): Timestamp of account creation.
- `updatedAt` (Date, auto): Timestamp of last update.

**Relationships:**

- Referenced in Complaints (submittedBy, assignedTo, assignedBy, etc.).
- Referenced in Notifications (user), ActivityLogs (user), Feedback (user, reviewedBy).

**Constraints and Indexes:**

- Unique index on `email`.
- Virtual fields: `status` (computed from approval/rejection flags), `registeredDate` (formatted creation date).

#### 2. Complaints Collection

The Complaints collection is the core entity, storing all complaint submissions, assignments, and resolutions. It supports the full workflow from submission to closure.

**Schema Fields:**

- `complaintCode` (String, unique, auto-generated): Unique identifier for the complaint (e.g., CMP-ABC123).
- `title` (String, required): Brief title of the complaint.
- `category` (String, required): Category of the complaint.
- `department` (String, optional): Department related to the complaint.
- `description` (String, max 10000 chars): Detailed description.
- `status` (String, enum: ["Pending", "Assigned", "Accepted", "In Progress", "Under Review", "Resolved", "Closed"], default: "Pending"): Current status.
- `submittedBy` (ObjectId, ref: "User", required): Reference to the submitting user.
- `sourceRole` (String, enum: ["student", "staff", "dean", "hod", "admin"], default: "student"): Role of the submitter.
- `assignedByRole` (String, enum: ["student", "hod", "dean", "admin"], optional): Role that performed the last assignment.
- `assignedBy` (ObjectId, ref: "User", optional): User who assigned the complaint.
- `assignmentPath` (Array of Strings, enum: ["student", "hod", "dean", "admin", "staff"]): History of assignment roles.
- `submittedTo` (String, optional): Target role or entity for submission.
- `assignedTo` (ObjectId, ref: "User", optional): Currently assigned user.
- `feedback` (Embedded Object): Contains rating, comment, submittedAt, reviewed, reviewedAt, reviewedBy.
- `priority` (String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium"): Priority level.
- `deadline` (Date, optional): Resolution deadline.
- `isEscalated` (Boolean, default: false): Escalation flag.
- `escalatedOn` (Date, optional): Escalation timestamp.
- `assignedAt` (Date, optional): Assignment timestamp.
- `evidenceFile` (String, optional): URL or path to evidence file.
- `resolutionNote` (String, optional): Note on resolution.
- `resolvedAt` (Date, optional): Resolution timestamp.
- `isDeleted` (Boolean, default: false): Soft delete flag.
- `deletedAt` (Date, optional): Soft delete timestamp.
- `deletedBy` (ObjectId, ref: "User", optional): User who deleted.
- `lastEditedAt` (Date, optional): Last edit timestamp.
- `editsCount` (Number, default: 0): Number of edits.
- `recipientRole` (String, enum: ["staff", "hod", "dean", "admin", null], optional): Target role chosen by student.
- `recipientId` (ObjectId, ref: "User", optional): Specific recipient user (required for dean submissions).
- `isAnonymous` (Boolean, default: false): Anonymity flag.
- `createdAt` (Date, auto): Submission timestamp.
- `updatedAt` (Date, auto): Last update timestamp.

**Relationships:**

- References Users (submittedBy, assignedTo, assignedBy, deletedBy, recipientId, feedback.reviewedBy).
- Referenced in Notifications (complaint), ActivityLogs (complaint), Feedback (complaintId).

**Constraints and Indexes:**

- Unique index on `complaintCode`.
- Indexes on `submittedBy`, `assignedTo`, `recipientRole`, `isDeleted`, `isAnonymous`.
- Pre-validation: Dean submissions require `recipientRole='dean'` and `recipientId`.

#### 3. Categories Collection

The Categories collection defines complaint categories, allowing role-based restrictions and descriptions.

**Schema Fields:**

- `name` (String, required, unique): Category name.
- `roles` (Array of Strings, enum: ["student", "staff", "hod", "dean", "admin"]): Allowed roles (empty means all).
- `description` (String, optional): Category description.
- `status` (String, enum: ["active", "inactive"], default: "active"): Category status.
- `createdBy` (ObjectId, ref: "User"): User who created the category.
- `createdAt` (Date, auto): Creation timestamp.
- `updatedAt` (Date, auto): Update timestamp.

**Relationships:**

- Referenced in Complaints (category, as string match).

#### 4. Notifications Collection

The Notifications collection handles in-app notifications for users about complaint updates and system events.

**Schema Fields:**

- `user` (ObjectId, ref: "User", required): Recipient user.
- `complaint` (ObjectId, ref: "Complaint", optional): Related complaint.
- `role` (String, enum: ["student", "staff", "hod", "dean", "admin"], optional): User's role snapshot.
- `type` (String, enum: ["submission", "assignment", "accept", "reject", "status", "feedback", "user-signup"], required): Notification type.
- `title` (String, required): Notification title.
- `message` (String, required): Notification message.
- `read` (Boolean, default: false): Read status (legacy, use virtual `isRead`).
- `meta` (Object, default: {}): Additional metadata.
- `createdAt` (Date, auto): Creation timestamp.
- `updatedAt` (Date, auto): Update timestamp.

**Relationships:**

- References Users (user), Complaints (complaint).

**Constraints and Indexes:**

- Index on `{ user: 1, createdAt: -1 }` for efficient per-user queries.
- Virtual field: `isRead` (alias for `read`).

#### 5. ActivityLogs Collection

The ActivityLogs collection maintains an audit trail of all actions performed on complaints.

**Schema Fields:**

- `user` (ObjectId, ref: "User", required): User who performed the action.
- `role` (String, required): Role of the user at the time.
- `action` (String, required): Description of the action (e.g., "Assigned complaint").
- `complaint` (ObjectId, ref: "Complaint", required): Related complaint.
- `timestamp` (Date, default: now): Action timestamp.
- `details` (Object, default: {}): Additional action details.

**Relationships:**

- References Users (user), Complaints (complaint).

#### 6. Feedback Collection

The Feedback collection stores user feedback on resolved complaints, including ratings and reviews.

**Schema Fields:**

- `complaintId` (ObjectId, ref: "Complaint", required): Related complaint.
- `user` (ObjectId, ref: "User", required): User providing feedback.
- `targetAdmin` (ObjectId, ref: "User", optional): Specific admin if feedback is private.
- `isAdminFeedback` (Boolean, default: false): Flag for admin-directed feedback.
- `rating` (Number, min: 1, max: 5, required): Rating score.
- `comments` (String, max 1000 chars): Feedback comments.
- `reviewStatus` (String, enum: ["Not Reviewed", "Reviewed"], default: "Not Reviewed"): Review status.
- `reviewedAt` (Date, optional): Review timestamp.
- `reviewedBy` (ObjectId, ref: "User", optional): User who reviewed.
- `archived` (Boolean, default: false): Archive flag.
- `createdAt` (Date, auto): Feedback submission timestamp.
- `updatedAt` (Date, auto): Update timestamp.

**Relationships:**

- References Complaints (complaintId), Users (user, targetAdmin, reviewedBy).

This database design ensures data integrity through references, efficient querying via indexes, and supports the role-based workflow of the CMS. The schema is normalized to avoid redundancy while allowing flexible embedding for performance.
