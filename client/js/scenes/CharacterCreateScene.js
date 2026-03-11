/**
 * CharacterCreateScene - Avatar customization with visual preview
 * Lets players customize skin tone, hair color, name, gender, and age.
 * Uses Canvas palette-swap on AI-generated base images with marker colors.
 */
class CharacterCreateScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterCreateScene' });
    this.selectedSkinTone = '#FDEBD3';
    this.selectedHairColor = '#2C1810';
    this.selectedGender = 'female';
  }

  async create() {
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    if (!AvatarRenderer.isReady()) {
      await AvatarRenderer.preload();
    }
    this.createCharacterForm();
  }

  buildAvatarHTML() {
    return AvatarRenderer.renderAsHTML(this.selectedGender, this.selectedSkinTone, this.selectedHairColor);
  }

  refreshAvatar() {
    const el = document.getElementById('avatar-preview');
    if (el) {
      el.innerHTML = this.buildAvatarHTML();
    }
  }

  /**
   * Generate a circular color swatch button
   */
  buildSwatch(color, groupName, isSelected) {
    const borderColor = isSelected ? '#4fc3f7' : 'transparent';
    const shadow = isSelected ? '0 0 0 2px #4fc3f7' : 'none';
    return `<button
      class="color-swatch"
      data-group="${groupName}"
      data-color="${color}"
      style="
        width: 24px; height: 24px; border-radius: 50%;
        background: ${color};
        border: 2px solid ${borderColor};
        box-shadow: ${shadow};
        cursor: pointer;
        transition: all 0.2s ease;
        outline: none;
        flex-shrink: 0;
      "
      aria-label="${groupName} ${color}"
    ></button>`;
  }

  createCharacterForm() {
    const skinTones = [
      '#FDEBD3', '#F5D0B0', '#DBA87A', '#C68642', '#8D5524',
      '#5C3310', '#3B2106', '#2A1704', '#1A0F02',
    ];
    const hairColors = [
      '#2C1810', '#4A2912', '#8B4513', '#D2691E', '#E8430A',
      '#F4C430', '#C0A55E', '#888888', '#D8BFD8',
    ];

    const overlay = document.getElementById('ui-overlay');
    overlay.innerHTML = '';

    const formContainer = document.createElement('div');
    formContainer.className = 'modal-backdrop';
    formContainer.innerHTML = `
      <div class="modal-content" style="max-width: 460px; padding: 28px 32px 24px; max-height: 92vh; overflow-y: auto;">
        <h2 style="margin-bottom: 6px;">👤 Create Your Character</h2>
        <p style="color: #95a5a6; text-align: center; margin-bottom: 18px; font-size: 14px;">
          Create the character who will represent you in Valrenta City.
        </p>

        <!-- Avatar Preview -->
        <div id="avatar-preview">
          ${this.buildAvatarHTML()}
        </div>

        <!-- Skin Tone & Hair Color -->
        <div style="background: rgba(15,52,96,0.35); border: 1px solid rgba(52,152,219,0.15); border-radius: 10px; padding: 14px 16px; margin-bottom: 18px;">
          <div style="margin-bottom: 12px;">
            <label style="color: #7f8c8d; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px;">Skin tone</label>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;">
              ${skinTones.map(c => this.buildSwatch(c, 'skin', c === this.selectedSkinTone)).join('')}
            </div>
          </div>
          <div>
            <label style="color: #7f8c8d; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px;">Hair Color</label>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;">
              ${hairColors.map(c => this.buildSwatch(c, 'hair', c === this.selectedHairColor)).join('')}
            </div>
          </div>
        </div>

        <!-- Name -->
        <div class="form-group">
          <label for="char-name">Name</label>
          <input type="text" id="char-name" placeholder="Enter your character's name" maxlength="30">
          <div class="form-error" id="name-error"></div>
        </div>

        <!-- Gender -->
        <div class="form-group">
          <label for="char-gender">Gender</label>
          <select id="char-gender">
            <option value="">-- Select Gender --</option>
            <option value="male">Male</option>
            <option value="female" selected>Female</option>
            <option value="other">Other</option>
          </select>
          <div class="form-error" id="gender-error"></div>
        </div>

        <!-- Age -->
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

        <!-- Submit -->
        <div style="text-align: center; margin-top: 20px;">
          <button class="btn btn-primary" id="char-submit" style="width: 100%; padding: 12px; font-size: 16px;">
            Continue →
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(formContainer);

    // --- Swatch interaction ---
    formContainer.querySelectorAll('.color-swatch').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        if (btn.style.borderColor === 'transparent') {
          btn.style.transform = 'scale(1.15)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
      });

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const group = btn.dataset.group;
        const color = btn.dataset.color;

        if (group === 'skin') {
          this.selectedSkinTone = color;
        } else {
          this.selectedHairColor = color;
        }

        // Update swatch highlights
        formContainer.querySelectorAll(`.color-swatch[data-group="${group}"]`).forEach(s => {
          const isActive = s.dataset.color === color;
          s.style.borderColor = isActive ? '#4fc3f7' : 'transparent';
          s.style.boxShadow = isActive ? '0 0 0 2px #4fc3f7' : 'none';
        });

        this.refreshAvatar();
      });
    });

    // --- Gender change updates the avatar ---
    document.getElementById('char-gender').addEventListener('change', (e) => {
      this.selectedGender = e.target.value || 'female';
      this.refreshAvatar();
    });

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
    const skinTone = this.selectedSkinTone;
    const hairColor = this.selectedHairColor;

    // Clear previous errors
    ['name', 'gender', 'age'].forEach(f => {
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

    if (hasError) return;

    // Disable button while saving
    const btn = document.getElementById('char-submit');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      await GameAPI.saveCharacter({ gender, age, race: '', name, skinTone, hairColor });
      GameState.character = { gender, age, name, skinTone, hairColor };
      document.getElementById('ui-overlay').innerHTML = '';
      this.scene.start('MapScene');
    } catch (error) {
      btn.disabled = false;
      btn.textContent = 'Continue →';
      console.error('Failed to save character:', error);
    }
  }
}
