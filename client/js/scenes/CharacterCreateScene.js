/**
 * CharacterCreateScene - Character creation using DOM overlay
 * Collects gender, age, race, and name from the player.
 */
class CharacterCreateScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterCreateScene' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Dark background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Create DOM form overlay
    this.createCharacterForm();
  }

  createCharacterForm() {
    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const formContainer = document.createElement('div');
    formContainer.className = 'modal-backdrop';
    formContainer.innerHTML = `
      <div class="modal-content" style="max-width: 480px;">
        <h2>👤 Create Your Character</h2>
        <p style="color: #95a5a6; text-align: center; margin-bottom: 20px; font-size: 14px;">
          Create the character who will represent you in Valrenta City.
        </p>

        <div class="form-group">
          <label for="char-name">Name</label>
          <input type="text" id="char-name" placeholder="Enter your character's name" maxlength="30">
          <div class="form-error" id="name-error"></div>
        </div>

        <div class="form-group">
          <label for="char-gender">Gender</label>
          <select id="char-gender">
            <option value="">-- Select Gender --</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non-binary">Non-binary</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
          <div class="form-error" id="gender-error"></div>
        </div>

        <div class="form-group">
          <label for="char-age">Age</label>
          <select id="char-age">
            <option value="">-- Select Age Range --</option>
            <option value="18-24">18–24</option>
            <option value="25-34">25–34</option>
            <option value="35-44">35–44</option>
            <option value="45-54">45–54</option>
            <option value="55+">55+</option>
          </select>
          <div class="form-error" id="age-error"></div>
        </div>

        <div class="form-group">
          <label for="char-race">Race / Ethnicity</label>
          <select id="char-race">
            <option value="">-- Select Race/Ethnicity --</option>
            <option value="white">White / Caucasian</option>
            <option value="black">Black / African American</option>
            <option value="hispanic">Hispanic / Latino</option>
            <option value="asian">Asian</option>
            <option value="native">Native American / Alaska Native</option>
            <option value="pacific">Native Hawaiian / Pacific Islander</option>
            <option value="multiracial">Multiracial</option>
            <option value="other">Other</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
          <div class="form-error" id="race-error"></div>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <button class="btn btn-primary" id="char-submit" style="width: 100%; padding: 12px;">
            Continue →
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(formContainer);

    // Handle submit
    document.getElementById('char-submit').addEventListener('click', () => this.handleSubmit());

    // Allow Enter key to submit
    formContainer.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleSubmit();
    });
  }

  async handleSubmit() {
    const name = document.getElementById('char-name').value.trim();
    const gender = document.getElementById('char-gender').value;
    const age = document.getElementById('char-age').value;
    const race = document.getElementById('char-race').value;

    // Clear previous errors
    ['name', 'gender', 'age', 'race'].forEach(f => {
      document.getElementById(`${f}-error`).textContent = '';
    });

    // Validate
    let hasError = false;
    if (!name) {
      document.getElementById('name-error').textContent = 'Please enter a name.';
      hasError = true;
    }
    if (!gender) {
      document.getElementById('gender-error').textContent = 'Please select a gender.';
      hasError = true;
    }
    if (!age) {
      document.getElementById('age-error').textContent = 'Please select an age range.';
      hasError = true;
    }
    if (!race) {
      document.getElementById('race-error').textContent = 'Please select a race/ethnicity.';
      hasError = true;
    }

    if (hasError) return;

    // Disable button while saving
    const btn = document.getElementById('char-submit');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      await GameAPI.saveCharacter({ gender, age, race, name });

      // Store in game state
      GameState.character = { gender, age, race, name };

      // Clear overlay
      document.getElementById('ui-overlay').innerHTML = '';

      // Transition to job selection
      this.scene.start('JobSelectScene');
    } catch (error) {
      btn.disabled = false;
      btn.textContent = 'Continue →';
      console.error('Failed to save character:', error);
    }
  }
}
