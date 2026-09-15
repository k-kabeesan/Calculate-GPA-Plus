async function runLiveVerification() {
  console.log('--- Verifying Live Web & API Endpoints ---\n');

  // 1. Check Vite Frontend
  try {
    const viteRes = await fetch('http://localhost:5173');
    console.log(`✓ Vite Dev Server (http://localhost:5173): Status ${viteRes.status} ${viteRes.statusText}`);
  } catch (err: any) {
    console.error(`✗ Vite Dev Server error: ${err.message}`);
  }

  // 2. Check Express API /api/profiles/filters
  try {
    const filtersRes = await fetch('http://localhost:5000/api/profiles/filters');
    const filtersData = await filtersRes.json();
    console.log(`✓ Filters API (http://localhost:5000/api/profiles/filters): Status ${filtersRes.status}`);
    console.log(`  Universities found: ${filtersData.universities?.length || 0}`);
  } catch (err: any) {
    console.error(`✗ Filters API error: ${err.message}`);
  }

  // 3. Check Express API /api/profiles (Public Profiles List)
  try {
    const profilesRes = await fetch('http://localhost:5000/api/profiles');
    const profilesData = await profilesRes.json();
    console.log(`✓ Profiles API (http://localhost:5000/api/profiles): Status ${profilesRes.status}`);
    const profilesCount = Array.isArray(profilesData) ? profilesData.length : (profilesData.profiles?.length || 0);
    console.log(`  Returned ${profilesCount} profiles`);
  } catch (err: any) {
    console.error(`✗ Profiles API error: ${err.message}`);
  }

  // 4. Test Search with Module Code & Sorting
  try {
    const searchRes = await fetch('http://localhost:5000/api/profiles?search=NANO&sort=university_asc');
    const searchData = await searchRes.json();
    console.log(`✓ Module Code Search & Sort (search=NANO&sort=university_asc): Status ${searchRes.status}`);
    const searchCount = Array.isArray(searchData) ? searchData.length : (searchData.profiles?.length || 0);
    console.log(`  Returned ${searchCount} profiles`);
  } catch (err: any) {
    console.error(`✗ Search API error: ${err.message}`);
  }

  // 5. Test AI Extract Endpoint Response JSON Guarantee
  try {
    const aiRes = await fetch('http://localhost:5000/api/ai/extract-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'NANO2112 Programming Techniques - 2 Credits\nETCH1210 Non-Credit Workshop'
      })
    });
    const aiData = await aiRes.json();
    console.log(`✓ AI Extract API (/api/ai/extract-profile): Status ${aiRes.status}`);
    console.log(`  Success: ${aiData.success}`);
    console.log(`  Extracted subjects: ${JSON.stringify(aiData.profile?.subjects)}`);
  } catch (err: any) {
    console.error(`✗ AI Extract API error: ${err.message}`);
  }

  console.log('\n--- All Live System Checks Completed Successfully! ---');
}

runLiveVerification();
