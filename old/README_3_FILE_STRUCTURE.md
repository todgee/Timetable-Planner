# Timetable Planner - 3-File Architecture

## 📁 File Structure

```
timetable-planner/
├── login.html          # Entry point - authentication
├── admin.html          # Full admin interface
├── view.html           # ESO read-only view
├── shared.js           # Common functions & Firebase config
├── styles.css          # Shared styles (extract from current index.html)
├── manifest.json       # PWA configuration
├── service-worker.js   # PWA offline support
└── icons/              # App icons
```

## 🔐 Authentication Flow

```
User visits → login.html
             ↓
     Selects role (ESO or Leadership)
             ↓
     Enters credentials
             ↓
     Firebase authenticates
             ↓
    ┌────────────────┐
    │                │
    ↓                ↓
admin.html      view.html
(Leadership)    (ESO Staff)
```

## 📄 File Descriptions

### **login.html** (~300 lines)
- Clean login interface
- Role selection (ESO or Leadership)
- Firebase authentication
- Redirects to admin.html or view.html based on role
- Session management

### **view.html** (~350 lines)
- ESO read-only timetable view
- No editing capabilities
- Can view all days
- See counters
- Print functionality
- Loads data from Firebase

### **admin.html** (~2000 lines)
- Full timetable management
- Manage people & classes (modals)
- Edit time slots
- Create/edit/delete assignments
- Export to Excel/PDF/PNG
- Save to Firebase
- Load from Firebase
- All admin features

### **shared.js** (~200 lines)
- Firebase configuration
- Authentication helpers (checkAuth, handleLogout)
- Time formatting utilities
- Firebase CRUD operations
- Common constants (days, colors)
- Notification system

### **styles.css** (To be created)
- All CSS extracted from current index.html
- Shared across all pages
- Single source of truth for styling

## 🔑 User Credentials

### ESO Staff (Viewer)
- Email: `eso@yourschool.com`
- Password: Set in Firebase Console
- Role: `viewer`
- Access: view.html (read-only)

### Leadership (Admin)
- Email: `admin@yourschool.com`  
- Password: Set in Firebase Console
- Role: `admin`
- Access: admin.html (full control)

## 🚀 Deployment

### GitHub Pages Setup
1. Upload all files to repository
2. Enable GitHub Pages (Settings → Pages)
3. Set to deploy from main branch
4. Access via: `https://yourusername.github.io/Timetable-Planner/login.html`

### File Changes Required
- Update manifest.json start_url to `/login.html`
- Update service-worker.js to cache login.html, admin.html, view.html, shared.js, styles.css

## ✅ Benefits of This Architecture

### 1. **Separation of Concerns**
- Login logic isolated
- Admin and ESO interfaces separate
- Easier to understand and maintain

### 2. **Better Performance**
- ESO users load ~60% less code
- Faster initial page load
- Smaller file sizes

### 3. **Improved Security**
- ESO users don't download admin code
- Clear role boundaries
- Harder to bypass restrictions

### 4. **Easier Maintenance**
- Update one role without affecting the other
- Shared code in one place (shared.js)
- Clear file organization

### 5. **Scalability**
- Easy to add new roles in future
- Can create mobile-specific views
- Ready for more features

## 🔄 Session Management

- Uses `sessionStorage` for current session
- Firebase auth for verification
- Auto-logout on browser close
- Manual logout available
- Redirects to login if session expires

## 📊 Code Distribution

| File | Lines | Purpose |
|------|-------|---------|
| login.html | ~300 | Authentication only |
| view.html | ~350 | Read-only timetable |
| admin.html | ~2000 | Full admin interface |
| shared.js | ~200 | Common utilities |
| styles.css | ~800 | Shared styles |
| **Total** | **~3650** | (vs 3000 in single file) |

Note: Total is slightly higher due to reduced duplication being offset by clearer structure.

## 🛠️ Next Steps

1. ✅ Create login.html (Done)
2. ✅ Create shared.js (Done)
3. ✅ Create view.html (Done)
4. ⏳ Create admin.html (In progress)
5. ⏳ Extract styles.css from current index.html
6. ⏳ Update manifest.json
7. ⏳ Update service-worker.js
8. ⏳ Test authentication flow
9. ⏳ Deploy to GitHub Pages

## 📝 Notes

- All three HTML files load shared.js for common functionality
- Firebase config is in shared.js (single source)
- Styles will be in styles.css (shared CSS file)
- Each page checks authentication on load
- Wrong role redirects to correct page automatically
