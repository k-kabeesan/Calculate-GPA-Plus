import { PageHead } from '../components/ui';

export function PrivacyPage() {
  return <div className="container narrow">
    <PageHead eyebrow="YOUR DATA" title="Privacy Policy">How Calculate GPA Plus handles academic profiles, grade calculations, and browser storage.</PageHead>

    <section className="panel static-page stack">
      <h2>Private grade calculations</h2>
      <p>When you use the standalone calculator or choose grades while viewing a shared profile, GPA and CGPA calculations happen in your browser. Those choices are not sent to the profile API. Grade choices made on a shared profile are saved in this browser so you can return to your result.</p>

      <h2>Shared profile structure</h2>
      <p>Profile creators publish a profile name, university, faculty, optional department, degree, academic year, description, semesters, modules, credits, and grading scale. A creator may also save grades with a profile. Published profile details, including any saved grades, are visible to anyone with access to the public profile. A viewer's own grade choices do not change the shared profile or another viewer's result.</p>

      <h2>Passcode protection</h2>
      <p>Creating a profile requires an owner passcode. Editing or deleting the profile requires that passcode to be verified by the server. New passcodes are stored as salted scrypt hashes; older profiles may use SHA-256 hashes. Passcodes are sent to the server for verification and are not stored in browser drafts or saved as plaintext in the database.</p>

      <h2>Browser storage</h2>
      <p>Grade choices on a shared profile are kept in this browser's local storage. When you move a calculator result or imported modules into a new profile, a temporary draft is kept in session storage for that handoff and then removed. The app does not automatically save unsubmitted profile forms. Owner passcodes are not included in these drafts.</p>

      <h2>Privacy summary</h2>
      <ul>
        <li>No account or email address is required to calculate a GPA.</li>
        <li>Viewing a shared profile and choosing your own grades does not overwrite its published modules or anyone else's choices.</li>
        <li>PDF academic reports are generated in your browser. The app does not upload the generated report or the student name entered for it.</li>
      </ul>
    </section>
  </div>;
}
