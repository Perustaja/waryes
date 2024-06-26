import {ComboBoxSelectedItemChangedEvent} from '@vaadin/combo-box';
import {css, html, LitElement} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {
  Veterancy,
  Cohesion,
  ARTY_VETERANCIES,
  PLANE_VETERANCIES,
  PLANE_COHESIONS,
  COHESIONS,
  VETERANCIES,
  SF_VETERANCIES,
  VETERANCY_MODIFIERS_MAP,
  COHESION_MODIFIERS_MAP,
} from '../lib/veterancies-and-cohesions';
import {BundleManagerService, DamageTable} from '../services/bundle-manager';
import {FamilyIndexTuple} from '../types/damageTable';
import {MovementType, Unit, Weapon} from '../types/unit';

const DROP_OFF = {
  // eslint-disable-next-line camelcase
  DamageTypeEvolutionOverRangeDescriptor_AP1_AC_Helo: 350,
  // eslint-disable-next-line camelcase
  DamageTypeEvolutionOverRangeDescriptor_AP1_1Km: 175,
  // eslint-disable-next-line camelcase
  DamageTypeEvolutionOverRangeDescriptor_Balle_500: 500,
  // eslint-disable-next-line camelcase
  DamageTypeEvolutionOverRangeDescriptor_DCA: 700,
};

const EXTRA_SUPPRESSION_DAMAGE_PER_DAMAGE = 0;
const MAX_SUPPRESSION = 500;

// bidirectional map
const TERRAIN_NAMES_MAP = {
  ForetLegere: 'Forest',
  Ruin: 'Ruin',
  Batiment: 'Building',
  None: 'None',
};

export const enum Motion {
  STATIC = 'Static',
  MOVING = 'Moving',
}

export const enum Side {
  FRONT = 'Front',
  SIDE = 'Side',
  REAR = 'Rear',
  TOP = 'Top',
}

const REVERSE_TERRAIN_NAMES_MAP = {};

for (const key in TERRAIN_NAMES_MAP) {
  if (Object.prototype.hasOwnProperty.call(TERRAIN_NAMES_MAP, key)) {
    const terrainKey = key as keyof typeof TERRAIN_NAMES_MAP;
    const reverseTerrainKey = TERRAIN_NAMES_MAP[
      terrainKey
    ] as keyof typeof REVERSE_TERRAIN_NAMES_MAP;
    REVERSE_TERRAIN_NAMES_MAP[reverseTerrainKey] = terrainKey as never;
  }
}

@customElement('damage-calculator')
export class DamageCalculator extends LitElement {
  static get styles() {
    return css`
      .weapon-and-target {
        display: flex;
        gap: var(--lumo-space-m);
      }

      .card {
        display: flex;
        flex-direction: column;
        background-color: var(--lumo-contrast-5pct);
        border-radius: var(--lumo-border-radius);
        padding: var(--lumo-space-m);
      }

      .label-with-input {
        display: flex;
        flex-direction: column;
        flex: 1 1 0;
        align-items: center;
      }

      vaadin-combo-box {
        width: 100%;
        margin: 0;
        padding: 0;
      }

      vaadin-number-field {
        width: 100%;
        margin: 0;
        padding: 0;
      }

      .options {
        display: flex;
        gap: var(--lumo-space-m);
        padding: var(--lumo-space-m) 0;
        flex-wrap: wrap;
      }

      .options > * {
        flex: 1 1 0;
      }

      .button-bar {
        display: flex;
        justify-content: flex-end;
      }

      .error {
        color: var(--lumo-error-text-color);
        text-align: center;
        font-weight: bold;
      }

      input[type='range'] {
        height: 16px;
        -webkit-appearance: none;
        margin: 14px 0;
        width: 100%;
        background: transparent;
        min-width: 100px;
      }

      input[type='range'][disabled] {
        opacity: 40%;
        pointer-events: none;
        color: var(--lumo-disabled-text-color);
        -webkit-text-fill-color: var(--lumo-disabled-text-color);
      }

      label {
        color: var(--lumo-contrast-70pct);
        display: flex;
      }

      .value {
        color: var(--lumo-body-text-color);
        margin-left: var(--lumo-space-s);
      }

      label.disabled {
        color: var(--lumo-contrast-70pct) !important;
      }

      input[type='range']:focus {
        outline: none;
      }
      input[type='range']::-webkit-slider-runnable-track {
        width: 100%;
        height: 8px;
        cursor: pointer;
        animate: 0.2s;
        background: hsla(214, 60%, 80%, 0.14);
        border-radius: 2px;
      }
      input[type='range']::-webkit-slider-thumb {
        height: 14px;
        width: 14px;
        border-radius: 2px;
        background: #ff1fec;
        cursor: pointer;
        -webkit-appearance: none;
        margin-top: -3px;
        border: 0px;
      }
      input[type='range']:focus::-webkit-slider-runnable-track {
        background: hsla(214, 60%, 80%, 0.14);
      }
      input[type='range']::-moz-range-track {
        width: 100%;
        height: 8px;
        cursor: pointer;
        animate: 0.2s;
        background: hsla(214, 60%, 80%, 0.14);
        border-radius: 2px;
      }
      input[type='range']::-moz-range-thumb {
        height: 14px;
        width: 14px;
        border-radius: 2px;
        background: #ff1fec;
        cursor: pointer;
        border: 0px;
      }
      input[type='range']::-ms-track {
        width: 100%;
        height: 8px;
        cursor: pointer;
        animate: 0.2s;
        background: transparent;
        border-color: transparent;
        color: transparent;
      }
      input[type='range']::-ms-fill-lower {
        background: hsla(214, 60%, 80%, 0.14);
        border-radius: 8px;
      }
      input[type='range']::-ms-fill-upper {
        background: hsla(214, 60%, 80%, 0.14);
        border-radius: 8px;
      }
      input[type='range']::-ms-thumb {
        margin-top: 1px;
        height: 14px;
        width: 14px;
        border-radius: 2px;
        background: #ff1fec;
        cursor: pointer;
      }
      input[type='range']:focus::-ms-fill-lower {
        background: hsla(214, 60%, 80%, 0.14);
      }
      input[type='range']:focus::-ms-fill-upper {
        background: hsla(214, 60%, 80%, 0.14);
      }

      .range-field {
        --lumo-text-field-size: var(--lumo-size-m);
        color: var(--lumo-body-text-color);
        font-size: var(--lumo-font-size-m);
        font-family: var(--lumo-font-family);
        padding-left: var(--lumo-space-m);
        padding-right: var(--lumo-space-m);
      }

      .min-max {
        display: flex;
        justify-content: space-between;
      }

      .disabled {
        opacity: 50%;
      }

      .end-tick {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: var(--lumo-contrast-70pct);
        font-size: var(--lumo-font-size-s);
      }

      .distance-value {
        font-size: var(--lumo-font-size-m);
        display: flex;
        justify-content: center;
      }
    `;
  }

  @state()
  private _weapon?: Weapon | undefined;

  @property()
  public get weapon(): Weapon | undefined {
    return this._weapon;
  }
  public set weapon(value: Weapon | undefined) {
    const oldAmmoDescriptor = this._weapon?.ammoDescriptorName;
    const newAmmoDescriptor = value?.ammoDescriptorName;
    this._weapon = value;

    if (oldAmmoDescriptor !== newAmmoDescriptor) {
      this.motion = Motion.STATIC;

      if (this.targetUnit) {
        this.maxRange = this.getMaxRangeOfWeaponTargettingUnit(this.targetUnit);
        this.minRange = this.getMinRangeOfWeaponTargettingUnit(this.targetUnit);
        this.distance = this.maxRange;
      }

      this.calculateDamage();
    }
  }

  private _sourceUnit?: Unit | undefined;

  @property()
  public get sourceUnit(): Unit | undefined {
    return this._sourceUnit;
  }
  public set sourceUnit(value: Unit | undefined) {
    if (value?.descriptorName !== this._sourceUnit?.descriptorName) {
      this.cohesion = undefined;
      this.sourceVeterancy = undefined;
    }
    this._sourceUnit = value;
  }

  private _targetUnit?: Unit | undefined;

  @state({
    hasChanged: (newVal, oldVal) => {
      return (
        (newVal as Unit)?.descriptorName !== (oldVal as Unit)?.descriptorName
      );
    },
  })
  public get targetUnit(): Unit | undefined {
    return this._targetUnit;
  }

  public set targetUnit(value: Unit | undefined) {
    if (!value) {
      this._targetUnit = undefined;
      this.maxRange = 0;
      this.minRange = 0;
      this.distance = 0;
      this.targetVeterancy = undefined;
      return;
    }

    const oldValue = this._targetUnit;
    this._targetUnit = value;
    this.maxRange = this.getMaxRangeOfWeaponTargettingUnit(value);
    this.minRange = this.getMinRangeOfWeaponTargettingUnit(value);

    if (oldValue?.descriptorName !== value?.descriptorName) {
      this.selectedTerrain = 'None';
      this.distance = this.maxRange;
      this.calculateDamage();
    }
  }

  @state()
  private maxRange = 0;

  @state()
  private minRange = 0;

  @state()
  armourDirection = Side.FRONT;

  @state()
  distance = 0;

  @state()
  selectedTerrain = 'None';

  @state()
  motion = Motion.STATIC;

  @state()
  cohesion?: Cohesion;

  @state()
  sourceVeterancy?: Veterancy;

  @state()
  targetVeterancy?: Veterancy;

  public async calculateDamage() {
    if (!this.weapon || !this.targetUnit) {
      return;
    }

    const {
      damageFamily,
      damage,
      simultaneousProjectiles,
      missileSpeed,
      missileAcceleration,
      suppressionDamage,
      damageMultiplier,
      suppressionMultiplier,
    } = await this.extractAmmunitionForTargetStats(
      this.weapon,
      this.targetUnit
    );

    const isMoving = this.motion === Motion.MOVING;

    const baseAccuracy = this.getAccuracy(
      isMoving,
      this.targetUnit?.movementType as MovementType
    );

    const baseAimTime = this.weapon?.aimingTime || 0;
    const baseReloadTime = this.weapon?.reloadTime || 0;
    const salvoLength = this.weapon?.salvoLength || 0;
    // timeBetweenSalvos is a misnomer here, it's actually the time between shots
    const timeBetweenShots = this.weapon?.timeBetweenSalvos || 0;

    const {accuracy, aimTime, reloadTime} = this.applyModifiersToWeaponStats(
      damageFamily,
      baseAccuracy,
      baseAimTime,
      baseReloadTime,
      isMoving,
      this.sourceVeterancy,
      this.targetVeterancy,
      this.cohesion,
    );

    const healthOfUnit = this.targetUnit?.maxDamage || 0;
    const damagePerShot = damage;
    const shotsToKill = Math.ceil(healthOfUnit / damagePerShot);
    const accuracyAsDecimal = accuracy / 100;
    const averageDamagePerShot = damagePerShot * accuracyAsDecimal;

    const shotsToKillWithAccuracy = Math.ceil(
      healthOfUnit / averageDamagePerShot
    );

    const {timeToKill, flightTimeOfOneMissile} = this.calculateTimeToKill(
      shotsToKill,
      aimTime,
      reloadTime,
      timeBetweenShots,
      salvoLength,
      simultaneousProjectiles,
      this.distance,
      missileSpeed,
      missileAcceleration
    );

    // WRONG
    const damagePerSecond = (shotsToKill * damagePerShot) / timeToKill;

    const {timeToKill: averageTimeToKill} = this.calculateTimeToKill(
      shotsToKillWithAccuracy,
      aimTime,
      reloadTime,
      timeBetweenShots,
      salvoLength,
      simultaneousProjectiles,
      this.distance,
      missileSpeed,
      missileAcceleration
    );

    // const averageDamagePerSecond = (shotsToKillWithAccuracy * averageDamagePerShot) / averageTimeToKill;

    const maxSuppression = MAX_SUPPRESSION;
    const suppressPerShot = suppressionDamage;
    const shotsToMaxSuppression = Math.ceil(maxSuppression / suppressPerShot);
    const averageSuppressPerShot = suppressPerShot * accuracyAsDecimal;
    const shotsToMaxSuppressionWithAccuracy = Math.ceil(
      maxSuppression / averageSuppressPerShot
    );

    const {timeToKill: suppressionTimeToKill} = this.calculateTimeToKill(
      shotsToMaxSuppression,
      aimTime,
      reloadTime,
      timeBetweenShots,
      salvoLength,
      simultaneousProjectiles,
      this.distance,
      missileSpeed,
      missileAcceleration
    );

    // const suppressionPerSecond = suppressPerShot / suppressionTimeToKill;

    const {timeToKill: suppressionTimeToKillWithAccuracy} =
      this.calculateTimeToKill(
        shotsToMaxSuppressionWithAccuracy,
        aimTime,
        reloadTime,
        timeBetweenShots,
        salvoLength,
        simultaneousProjectiles,
        this.distance,
        missileSpeed,
        missileAcceleration
      );

    this.dispatchEvent(
      new CustomEvent('damage-calculated', {
        detail: {
          damage,
          damagePerSecond,
          damageMultiplier,
          suppressionDamage,
          suppressionMultiplier,
          flightTimeOfOneMissile,
          timeToKill,
          shotsToKill,
          shotsToKillWithAccuracy,
          shotsToMaxSuppression,
          averageTimeToKill,
          suppressionTimeToKill,
          suppressionTimeToKillWithAccuracy,
          shotsToMaxSuppressionWithAccuracy,
          accuracy,
          canTarget: this.canSelectedUnitBeTargetedByWeapon(),
        },
      })
    );
  }

  private applyModifiersToWeaponStats(
    damageFamily: string,
    baseAccuracy: number,
    baseAimTime: number,
    baseReloadTime: number,
    isMoving: boolean,
    sourceVeterancy?: Veterancy,
    targetVeterancy?: Veterancy,
    cohesion?: Cohesion,
  ) {
    let ecmToApply = 0;

    if (damageFamily === 'missile_he') {
      ecmToApply = this.targetUnit?.ecm || 0;
    }

    let accuracy = baseAccuracy;

    let aimTime = baseAimTime;
    let reloadTime = baseReloadTime;

    // apply dodge first if applicable
    if (targetVeterancy) {
      const targetVeterancyModifier =
      VETERANCY_MODIFIERS_MAP[
        targetVeterancy as keyof typeof VETERANCY_MODIFIERS_MAP
      ];

      accuracy = accuracy - (((targetVeterancyModifier?.dodgeBonus?.[1] || 0) * 100) || 0)
    }

    if (sourceVeterancy) {
      const sourceVeterancyModifier =
        VETERANCY_MODIFIERS_MAP[
          sourceVeterancy as keyof typeof VETERANCY_MODIFIERS_MAP
        ];

      let accuracyModifier = sourceVeterancyModifier.staticAccuracy || ["+", 0];

      if(isMoving) {
        accuracyModifier = sourceVeterancyModifier.motionAccuracy || ["+", 0];
      }

      if(accuracyModifier[0] === "+") {
        accuracy = accuracy + (accuracyModifier[1] * 100);
      }
      else if(accuracyModifier[0] === "-") {
        accuracy = accuracy + (accuracyModifier[1] * 100);
      }

      aimTime = aimTime * (sourceVeterancyModifier.aimTime || 1);
      reloadTime = reloadTime * ( sourceVeterancyModifier.reloadTime || 1) ;
    }

    if (cohesion) {
      const cohesionModifier = COHESION_MODIFIERS_MAP[cohesion as keyof typeof COHESION_MODIFIERS_MAP];
      accuracy = accuracy * cohesionModifier.accuracy;
      if ((cohesionModifier?.aimTime || 0) > 0) {
        aimTime = aimTime * (cohesionModifier?.aimTime || 0);
      }

      if ((cohesionModifier?.reloadTime || 0) > 0) {
        reloadTime = reloadTime * (cohesionModifier?.reloadTime || 0);
      }
    }

    accuracy = accuracy * (1 + ecmToApply);
    // cap accuracy at 100% after all modifiers
    accuracy = Math.min(accuracy, 100);
    return {accuracy, aimTime, reloadTime};
  }

  private async extractAmmunitionForTargetStats(
    sourceWeapon: Weapon,
    targetUnit: Unit
  ) {
    let highestDamage = 0;
    let highestDamageMultiplier = 0;
    let highestDamageSuppressionMultiplier = 0;
    let highestDamageSuppressionDamage = 0;
    let highestDamageSimultaneousProjectiles = 0;
    let highestDamageFamily = '';

    const missileSpeed = sourceWeapon?.missileProperties?.maxMissileSpeed;
    const missileAcceleration =
      sourceWeapon?.missileProperties?.maxMissileAcceleration;

    const iterLength = sourceWeapon?.damageFamilies?.length || 0;
    const isEra = targetUnit?.era || false;

    for (let i = 0; i < iterLength; i++) {
      const damageFamilyWithIndex = sourceWeapon?.damageFamilies[i] as string;
      const damageDropOff = sourceWeapon?.damageDropOffTokens[i] as string;
      const isTandemCharge = sourceWeapon?.tandemCharges[i] as boolean;
      const suppress =
        sourceWeapon?.suppressDamages[i] * sourceWeapon.numberOfWeapons || 0;
      const numberOfSimultaenousProjectiles =
        sourceWeapon?.numberOfSimultaneousProjectiles[i];

      const damageDropOffValue = damageDropOff
        ? DROP_OFF[damageDropOff as keyof typeof DROP_OFF]
        : undefined;

      const {damageMultiplier, suppressionMultiplier} =
        (await this.getDamageMultipliers(
          damageFamilyWithIndex,
          damageDropOffValue
        )) || 0;
      const family = this.getFamilyOfFamilyIndex(damageFamilyWithIndex);

      let he = this.weapon?.totalHeDamage || 0;

      if (family === 'ap' || family === 'ap_missile') {
        he = 1;
      }

      let damage = he * damageMultiplier;

      const targetVeterancy = this.targetVeterancy;
      let suppressionVeterancyMultiplier = 1;

      if (targetVeterancy) {
        suppressionVeterancyMultiplier =
          VETERANCY_MODIFIERS_MAP[
            targetVeterancy as keyof typeof VETERANCY_MODIFIERS_MAP
          ]?.suppressionReceived || 1;
      }

      const suppressionDamage =
        suppress * suppressionMultiplier * suppressionVeterancyMultiplier +
        EXTRA_SUPPRESSION_DAMAGE_PER_DAMAGE * Math.floor(damage);

      if (isEra && isTandemCharge) {
        damage += 1;
      }

      if (damage > highestDamage) {
        highestDamage = damage;
        highestDamageMultiplier = damageMultiplier;
        highestDamageSuppressionMultiplier = suppressionMultiplier;
        highestDamageSuppressionDamage = suppressionDamage;
        highestDamageSimultaneousProjectiles = numberOfSimultaenousProjectiles;
        highestDamageFamily = family;
      }
    }
    return {
      damageFamily: highestDamageFamily,
      damage: highestDamage,
      simultaneousProjectiles: highestDamageSimultaneousProjectiles,
      missileSpeed,
      missileAcceleration,
      suppressionDamage: highestDamageSuppressionDamage,
      damageMultiplier: highestDamageMultiplier,
      suppressionMultiplier: highestDamageSuppressionMultiplier,
    };
  }

  async getTerrainResistanceMultiplierForDamageFamily(
    terrain: string,
    damageFamily: string,
    resistanceFamily: string
  ) {
    const damageTableData = await BundleManagerService.getDamageTable();
    const ndfFormOfTerrain =
      REVERSE_TERRAIN_NAMES_MAP[
        terrain as keyof typeof REVERSE_TERRAIN_NAMES_MAP
      ];

    const terrainMultiplier = damageTableData?.terrainResistances?.find(
      (el) => {
        return el.name === ndfFormOfTerrain;
      }
    );

    const damageFamilyMultipliers = terrainMultiplier?.damageFamilies?.find(
      (el) => {
        return el.damageFamily === damageFamily;
      }
    );

    const resistanceFamilyMultiplier =
      damageFamilyMultipliers?.resistances?.find((el) => {
        return el.type === resistanceFamily;
      });

    if (
      !terrainMultiplier ||
      !damageFamilyMultipliers ||
      !resistanceFamilyMultiplier
    ) {
      return 1;
    }

    return resistanceFamilyMultiplier.value;
  }

  getMaxRangeOfWeaponTargettingUnit(unit: Unit) {
    let maxRange = 0;
    const movemementType = unit?.movementType;

    if (movemementType === MovementType.LAND) {
      maxRange = this.weapon?.groundRange || 0;
    } else if (movemementType === MovementType.PLANE) {
      maxRange = this.weapon?.planeRange || 0;
    } else if (movemementType === MovementType.HELICOPTER) {
      maxRange = this.weapon?.helicopterRange || 0;
    }

    return maxRange;
  }

  getMinRangeOfWeaponTargettingUnit(unit: Unit) {
    let minRange = 0;
    const movemementType = unit?.movementType;

    if (movemementType === MovementType.LAND) {
      minRange = this.weapon?.groundMinRange || 0;
    } else if (movemementType === MovementType.PLANE) {
      minRange = this.weapon?.planeMinRange || 0;
    } else if (movemementType === MovementType.HELICOPTER) {
      minRange = this.weapon?.helicopterMinRange || 0;
    }

    return minRange;
  }

  getBaseAccuracy(moving: boolean) {
    if (moving) {
      return this.weapon?.movingAccuracy || 0;
    }

    return this.weapon?.staticAccuracy || 0;
  }

  getAccuracyScaling(moving: boolean, movemementType: MovementType) {
    let scaling;

    if (moving) {
      scaling = this.weapon?.movingAccuracyScaling;
    } else {
      scaling = this.weapon?.staticAccuracyScaling;
    }

    if (!scaling) {
      return;
    }

    if (movemementType === MovementType.LAND) {
      return scaling.ground;
    } else if (movemementType === MovementType.PLANE) {
      return scaling.plane;
    } else if (movemementType === MovementType.HELICOPTER) {
      return scaling.helicopter;
    }

    return undefined;
  }

  getAccuracy(moving: boolean, movementType: MovementType) {
    const distance = this.distance;
    const accuracyScaling = this.getAccuracyScaling(moving, movementType);
    if (!accuracyScaling) {
      return this.getBaseAccuracy(moving);
    }

    // find the two ranges that the distance is between
    let upperBoundAccuracy;
    let lowerBoundAccuracy;

    // if the distance is less than the minimum range, use the minimum range accuracy
    if (distance < accuracyScaling[0].distance) {
      upperBoundAccuracy = accuracyScaling[0];
      lowerBoundAccuracy = {
        accuracy: accuracyScaling[0].accuracy,
        distance: this.getMinRangeOfWeaponTargettingUnit(
          this.targetUnit as Unit
        ),
      };
    } else {
      for (let i = 0; i < accuracyScaling.length; i++) {
        const scalingItem = accuracyScaling[i];
        const nextScalingItem = accuracyScaling[i + 1];

        if (nextScalingItem === undefined) {
          upperBoundAccuracy = scalingItem;
          lowerBoundAccuracy = scalingItem;
          break;
        }

        if (
          distance >= scalingItem.distance &&
          distance <= nextScalingItem.distance
        ) {
          upperBoundAccuracy = scalingItem;
          lowerBoundAccuracy = nextScalingItem;
          break;
        }
      }
    }

    if (!upperBoundAccuracy || !lowerBoundAccuracy) {
      return this.getBaseAccuracy(moving);
    }

    // get the accuracy at the interpolation value
    const interpolationValue =
      (distance - lowerBoundAccuracy.distance) /
      (upperBoundAccuracy.distance - lowerBoundAccuracy.distance);

    // get the accuracy at the interpolation value
    const upperBoundAccuracyValue = upperBoundAccuracy.accuracy;
    const lowerBoundAccuracyValue = lowerBoundAccuracy.accuracy;

    const accuracy =
      lowerBoundAccuracyValue +
      (upperBoundAccuracyValue - lowerBoundAccuracyValue) * interpolationValue;

    return accuracy;
  }

  getIndexOfFamilyIndex(familyIndexString: string) {
    return Number(familyIndexString.split('-')[1]) - 1;
  }

  getFamilyOfFamilyIndex(familyIndexString: string) {
    return familyIndexString.split('-')[0];
  }

  findIndexOfFamily(
    familyIndexTuples: FamilyIndexTuple[],
    familyToFind: string
  ) {
    return familyIndexTuples.findIndex(
      (familyIndexTuple) => familyIndexTuple.family === familyToFind
    );
  }

  async getDamageMultipliers(
    damageFamilyWithIndex: string,
    damageDropOff?: number
  ): Promise<{
    damageMultiplier: number;
    suppressionMultiplier: number;
  }> {
    if (!this.weapon || !this.targetUnit) {
      throw new Error('Weapon or target unit not selected');
    }

    const damageTableData = await BundleManagerService.getDamageTable();

    const distance = this.distance;

    const damageFamily = this.getFamilyOfFamilyIndex(damageFamilyWithIndex);
    const damageFamilyIndex = this.getIndexOfFamilyIndex(damageFamilyWithIndex);

    const resistanceFamilyArmorKey =
      `${this.armourDirection.toLowerCase()}ArmorType` as keyof Unit;
    const resistanceFamilyWithIndex = this.targetUnit?.[
      resistanceFamilyArmorKey
    ] as string;

    const resistanceFamily = this.getFamilyOfFamilyIndex(
      resistanceFamilyWithIndex
    );
    const resistanceFamilyIndex = this.getIndexOfFamilyIndex(
      resistanceFamilyWithIndex
    );

    // AP weapons don't have accuracy on helicopters, so they can't hit them
    // this is a hacky way to fix that, rather than extracting the accuracy for each ammunition
    // as of writing, the accuracies are merged into one value for each weapon which is why this is necessary
    if (damageFamily === 'ap' && resistanceFamily === 'helico') {
      return {
        damageMultiplier: 0,
        suppressionMultiplier: 0,
      };
    }

    const indexOfTargetResistanceFamilyColumn =
      this.getIndexOfTargetResistanceFamilyColumn(
        damageTableData,
        resistanceFamily,
        resistanceFamilyIndex
      );

    const terrainMultiplier =
      await this.getTerrainResistanceMultiplierForDamageFamily(
        this.selectedTerrain,
        damageFamily,
        resistanceFamily
      );

    // Calculate suppression damage
    let suppressDamageFamily =
      damageTableData?.defaultSuppressDamage as FamilyIndexTuple;
    const suppressionDamageExceptions =
      damageTableData?.suppressionDamageExceptions || [];
    const suppressionDamageExceptionForDamageFamily =
      suppressionDamageExceptions.find(
        (suppressionDamageException) =>
          suppressionDamageException.exception === damageFamily
      );

    if (suppressionDamageExceptionForDamageFamily) {
      suppressDamageFamily =
        suppressionDamageExceptionForDamageFamily.suppression;
    }

    const indexOfSuppressDamageFamily = this.getDamageFamilyIndex(
      damageTableData,
      suppressDamageFamily.family
    );

    const minIndexOfSuppressDamageTable = this.getMinIndexOfDamageTable(
      indexOfSuppressDamageFamily,
      damageTableData
    );

    const indexOfSuppressDamageFamilyRow = this.getIndexOfDamageFamilyRow(
      minIndexOfSuppressDamageTable,
      0,
      0
    );

    const suppressDamageTableRow =
      damageTableData?.damageTable?.[indexOfSuppressDamageFamilyRow];

    const suppressDamageMultiplier =
      suppressDamageTableRow?.[indexOfTargetResistanceFamilyColumn];

    const indexOfDamageFamily = this.getDamageFamilyIndex(
      damageTableData,
      damageFamily
    );
    const minIndexOfDamageTable = this.getMinIndexOfDamageTable(
      indexOfDamageFamily,
      damageTableData
    );
    const indexesToRemove = this.getNumberOfIndexesToRemove(
      damageDropOff,
      distance
    );
    const indexOfDamageFamilyRow = this.getIndexOfDamageFamilyRow(
      minIndexOfDamageTable,
      damageFamilyIndex,
      indexesToRemove
    );

    const damageTableRow =
      damageTableData?.damageTable?.[indexOfDamageFamilyRow];

    // once we have the damage table row, we need to find the target family to find the column

    const damageMultiplier =
      damageTableRow?.[indexOfTargetResistanceFamilyColumn];

    return {
      damageMultiplier: (damageMultiplier || 0) * terrainMultiplier,
      suppressionMultiplier: suppressDamageMultiplier || 0,
    };
  }

  private getIndexOfTargetResistanceFamilyColumn(
    damageTableData: DamageTable,
    resistanceFamily: string,
    resistanceFamilyIndex: number
  ) {
    const indexOfTargetFamily =
      this.findIndexOfFamily(
        damageTableData?.resistanceFamilyWithIndexes as FamilyIndexTuple[],
        resistanceFamily
      ) || 0;

    const minIndexOfResistanceTable = this.getMinIndexOfResistanceTable(
      indexOfTargetFamily,
      damageTableData
    );

    const indexOfTargetResistanceFamilyColumn =
      minIndexOfResistanceTable + resistanceFamilyIndex;
    return indexOfTargetResistanceFamilyColumn;
  }

  private getMinIndexOfResistanceTable(
    indexOfTargetFamily: number,
    damageTableData: DamageTable
  ) {
    let minIndexOfResistanceTable = 0;

    for (let i = 0; i < indexOfTargetFamily; i++) {
      minIndexOfResistanceTable +=
        damageTableData?.resistanceFamilyWithIndexes?.[i]?.maxIndex || 0;
    }
    return minIndexOfResistanceTable;
  }

  private getIndexOfDamageFamilyRow(
    minIndexOfDamageTable: number,
    damageFamilyIndex: number,
    indexesToRemove: number
  ) {
    let indexOfDamageFamilyRow =
      minIndexOfDamageTable + damageFamilyIndex - indexesToRemove;

    if (indexOfDamageFamilyRow < minIndexOfDamageTable) {
      indexOfDamageFamilyRow = minIndexOfDamageTable;
    }
    return indexOfDamageFamilyRow;
  }

  private getNumberOfIndexesToRemove(
    damageDropOff: number | undefined,
    distance: number
  ) {
    let indexesToRemove = 0;

    if (damageDropOff) {
      indexesToRemove = Math.ceil(distance / (damageDropOff || 0) - 1);
    }
    return indexesToRemove;
  }

  private getMinIndexOfDamageTable(
    indexOfDamageFamily: number,
    damageTableData: DamageTable
  ) {
    let minIndexOfDamageTable = 0;

    // each record in damageFamilyWithIndexes is a tuple of family and maxIndex
    // the max index is where the current family ends in the damage table
    // so we need to add all the max indexes of the families before the current one
    for (let i = 0; i < indexOfDamageFamily; i++) {
      minIndexOfDamageTable +=
        damageTableData?.damageFamilyWithIndexes?.[i]?.maxIndex || 0;
    }
    return minIndexOfDamageTable;
  }

  private getDamageFamilyIndex(
    damageTableData: DamageTable,
    damageFamily: string
  ) {
    return (
      this.findIndexOfFamily(
        damageTableData?.damageFamilyWithIndexes as FamilyIndexTuple[],
        damageFamily
      ) || 0
    );
  }

  private getVeterancyOptions(unit?: Unit) {
    if (!unit) {
      return [];
    }

    const xpBonuses = unit.xpBonuses;

    if (xpBonuses.includes('ExperienceLevelsPackDescriptor_XP_pack_SF')) {
      return SF_VETERANCIES;
    } else if (
      xpBonuses.includes('ExperienceLevelsPackDescriptor_XP_pack_artillery')
    ) {
      return ARTY_VETERANCIES;
    } else if (
      xpBonuses.includes('ExperienceLevelsPackDescriptor_XP_pack_avion')
    ) {
      return PLANE_VETERANCIES;
    } else {
      return VETERANCIES;
    }
  }

  private getCohesionOptions() {
    if (!this.sourceUnit) {
      return [];
    }

    if (this.sourceUnit.movementType === MovementType.PLANE) {
      return PLANE_COHESIONS;
    }

    return COHESIONS;
  }

  renderDistanceSelect(shouldDisableOptions: boolean) {
    return html`
      <label for="distance" class=${shouldDisableOptions ? 'disabled' : ''}
        >Distance:
        <div class="value">${this.distance}m</div></label
      >
      <div class="range-field">
        <input
          type="range"
          id="distance"
          name="1"
          min="${this.minRange}"
          max="${this.maxRange}"
          .value="${this.distance}"
          ?disabled=${shouldDisableOptions}
          @input=${(e: InputEvent) => {
            this.distance = Number((e.target as HTMLInputElement).value);
            this.calculateDamage();
          }}
        />
      </div>
      <div class="min-max ${shouldDisableOptions ? 'disabled' : ''}">
        <div class="end-tick">
          <span>${this.minRange}m</span><span>Min</span>
        </div>
        <div class="end-tick">
          <span>${this.maxRange}m</span><span>Max</span>
        </div>
      </div>

      <div class="distance-value"></div>
    `;
  }

  render() {
    const selectedUnitCanBeTargetedByWeapon =
      this.canSelectedUnitBeTargetedByWeapon();
    const shouldDisableOptions =
      !this.weapon || !this.targetUnit || !selectedUnitCanBeTargetedByWeapon;

    const motionOptions: Motion[] = [];

    if ((this.weapon?.maxStaticAccuracy || 0) > 0) {
      motionOptions.push(Motion.STATIC);
    }

    if ((this.weapon?.maxMovingAccuracy || 0) > 0) {
      motionOptions.push(Motion.MOVING);
    }

    return html`
      ${!selectedUnitCanBeTargetedByWeapon && this.targetUnit
        ? html`<div class="error">Weapon cannot target unit</div>`
        : ''}

      <div class="options">
        <vaadin-combo-box
          label="Source Veterancy"
          ?disabled=${shouldDisableOptions}
          .selectedItem=${this.sourceVeterancy}
          .clearButtonVisible=${true}
          .items=${this.getVeterancyOptions(this.sourceUnit)}
          @selected-item-changed=${(
            e: ComboBoxSelectedItemChangedEvent<Veterancy>
          ) => {
            this.sourceVeterancy = e.detail.value || undefined;
            this.calculateDamage();
          }}
        >
        </vaadin-combo-box>
        <vaadin-combo-box
          label="Source Cohesion"
          ?disabled=${shouldDisableOptions}
          .selectedItem=${this.cohesion}
          .clearButtonVisible=${true}
          .items=${this.getCohesionOptions()}
          @selected-item-changed=${(
            e: ComboBoxSelectedItemChangedEvent<Cohesion>
          ) => {
            this.cohesion = e.detail.value || undefined;
            this.calculateDamage();
          }}
        >
        </vaadin-combo-box>
        <vaadin-combo-box
          label="Source Motion"
          ?disabled=${shouldDisableOptions}
          .selectedItem=${this.motion}
          .items=${[Motion.STATIC, Motion.MOVING]}
          @selected-item-changed=${(
            e: ComboBoxSelectedItemChangedEvent<Motion>
          ) => {
            this.motion = e.detail.value || Motion.STATIC;
            this.calculateDamage();
          }}
        >
        </vaadin-combo-box>

        <vaadin-combo-box
          label="Target Veterancy"
          ?disabled=${shouldDisableOptions}
          .selectedItem=${this.targetVeterancy}
          .clearButtonVisible=${true}
          .items=${this.getVeterancyOptions(this.targetUnit)}
          @selected-item-changed=${(
            e: ComboBoxSelectedItemChangedEvent<Veterancy>
          ) => {
            this.targetVeterancy = e.detail.value || undefined;
            this.calculateDamage();
          }}
        >
        </vaadin-combo-box>

        <vaadin-combo-box
          label="Target Direction"
          .selectedItem=${this.armourDirection}
          ?disabled=${shouldDisableOptions}
          .items=${[Side.FRONT, Side.SIDE, Side.REAR, Side.TOP]}
          @selected-item-changed=${(
            e: ComboBoxSelectedItemChangedEvent<Side>
          ) => {
            this.armourDirection = e.detail.value || Side.FRONT;
            this.calculateDamage();
          }}
        ></vaadin-combo-box>

        <vaadin-combo-box
          label="Target Terrain"
          ?disabled=${shouldDisableOptions}
          .selectedItem=${this.selectedTerrain}
          .items=${[
            'None',
            ...(this.targetUnit?.occupiableTerrains.map(
              (terrain: string) =>
                TERRAIN_NAMES_MAP[terrain as keyof typeof TERRAIN_NAMES_MAP] ||
                terrain
            ) || []),
          ] || []}
          @selected-item-changed=${(
            e: ComboBoxSelectedItemChangedEvent<string>
          ) => {
            this.selectedTerrain = e.detail.value || 'None';
            this.calculateDamage();
          }}
        ></vaadin-combo-box>
      </div>
      <div>${this.renderDistanceSelect(shouldDisableOptions)}</div>
    `;
  }

  private canSelectedUnitBeTargetedByWeapon() {
    return this.maxRange > 0;
  }

  private calculateTimeToKill(
    shotsToKill: number,
    aimingTime: number,
    reloadTime: number,
    timeBetweenShots: number,
    salvoLength: number,
    numberOfSimultaneousProjectiles: number,
    distance: number,
    missileSpeed?: number,
    missileAcceleration?: number
  ) {
    // number of shots divided by number of shots per salvo rounded up
    const numberOfReloads = Math.ceil(shotsToKill / salvoLength) - 1;
    const totalTimeReloading = numberOfReloads * reloadTime;

    let missileTravelTime = 0;
    let flightTimeOfOneMissile;

    if (missileSpeed && missileAcceleration) {
      const isFireAndForget = this.weapon?.traits.includes('F&F');

      const missileTimeToHitTarget = this.calculateDistanceTravelledByMissile(
        distance,
        missileSpeed,
        missileAcceleration
      );

      flightTimeOfOneMissile = missileTimeToHitTarget;

      if (isFireAndForget) {
        missileTravelTime = missileTimeToHitTarget;
      } else {
        missileTravelTime = missileTimeToHitTarget * shotsToKill;
      }
    }

    let instancesOfTimeBetweenShots = shotsToKill - 1 - numberOfReloads;

    if (
      numberOfSimultaneousProjectiles > 1 &&
      numberOfSimultaneousProjectiles <= salvoLength
    ) {
      const burstsToKill = Math.ceil(
        shotsToKill / numberOfSimultaneousProjectiles
      );
      const numberOfTimeBetweenShots = burstsToKill - 1;
      instancesOfTimeBetweenShots = numberOfTimeBetweenShots - numberOfReloads;

      if (flightTimeOfOneMissile && flightTimeOfOneMissile > 0) {
        missileTravelTime = flightTimeOfOneMissile * burstsToKill;
      }
    }

    const totalTimeBetweenShots =
      instancesOfTimeBetweenShots * timeBetweenShots;
    const timeToKill =
      aimingTime +
      totalTimeReloading +
      totalTimeBetweenShots +
      missileTravelTime;

    return {timeToKill, flightTimeOfOneMissile};
  }

  private calculateDistanceTravelledByMissile(
    distance: number,
    missileSpeed: number,
    missileAcceleration: number
  ): number {
    let time = 0;

    const timeTilMaxVelocity = missileSpeed / missileAcceleration;
    const distanceTravelledTilMaxVelocity =
      0.5 * missileAcceleration * timeTilMaxVelocity * timeTilMaxVelocity;

    if (distanceTravelledTilMaxVelocity > distance) {
      // missile never reaches max velocity
      time = Math.sqrt((2 * distance) / missileAcceleration);
    } else {
      // missile reaches max velocity
      const distanceTravelledAfterMaxVelocity =
        distance - distanceTravelledTilMaxVelocity;
      const timeAfterMaxVelocity =
        distanceTravelledAfterMaxVelocity / missileSpeed;
      time = timeTilMaxVelocity + timeAfterMaxVelocity;
    }

    return time;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'damage-calculator': DamageCalculator;
  }
}
