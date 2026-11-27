// Artwork and original biome choices: MrsTrader. Bounded scheduler: WARLAND.
const ParticleVariants = {
    "blizzard_snow": ["warland_biomes:blizzardsnow_6", "warland_biomes:blizzardsnow_5", "warland_biomes:blizzardsnow_4", "warland_biomes:blizzardsnow_3", "warland_biomes:blizzardsnow_2", "warland_biomes:blizzardsnow_1", "warland_biomes:blizzardsnow_0"],
    "blizzard_wind": ["warland_biomes:gust_4", "warland_biomes:gust_3", "warland_biomes:gust_2", "warland_biomes:gust_1", "warland_biomes:gust_0"],
    "firefly": ["warland_biomes:fireflies", "warland_biomes:fireflies_emitterblock"],
    "rain": ["warland_biomes:rain_1", "warland_biomes:rain"],
    "rain_splash": ["warland_biomes:rainsplash_3", "warland_biomes:rainsplash_2", "warland_biomes:rainsplash_1", "warland_biomes:rainsplash_0"],
    "rain_trail": ["warland_biomes:raindrop_trail"],
    "red_sand_mote": ["warland_biomes:redsandmote"],
    "sand_mote": ["warland_biomes:sandmote"],
    "snow": ["warland_biomes:snow_6", "warland_biomes:snow_5", "warland_biomes:snow_4", "warland_biomes:snow_3", "warland_biomes:snow_2", "warland_biomes:snow_1", "warland_biomes:snow_0"],
    "storm_soul": ["warland_biomes:stormsoul_09", "warland_biomes:stormsoul_08", "warland_biomes:stormsoul_07", "warland_biomes:stormsoul_06", "warland_biomes:stormsoul_05", "warland_biomes:stormsoul_04", "warland_biomes:stormsoul_03", "warland_biomes:stormsoul_02", "warland_biomes:stormsoul_01", "warland_biomes:stormsoul_00"],
    "tumble_bush": ["warland_biomes:tumble_bush_3", "warland_biomes:tumble_bush_2", "warland_biomes:tumble_bush_1", "warland_biomes:tumble_bush_0"],
    "warped_spore": ["warland_biomes:warpedspore_3", "warland_biomes:warpedspore_2", "warland_biomes:warpedspore_1", "warland_biomes:warpedspore_0"],
    "weeping_tear": ["warland_biomes:weepingtear_4", "warland_biomes:weepingtear_3", "warland_biomes:weepingtear_2", "warland_biomes:weepingtear_1", "warland_biomes:weepingtear_0"],
    "weeping_tear_splash": ["warland_biomes:weepingtearsplash_3", "warland_biomes:weepingtearsplash_2", "warland_biomes:weepingtearsplash_1", "warland_biomes:weepingtearsplash_0"],
    "wind": ["warland_biomes:wind_full", "warland_biomes:gust_4", "warland_biomes:gust_3", "warland_biomes:gust_2", "warland_biomes:gust_1", "warland_biomes:gust_0"],
    "wind_trail": ["warland_biomes:wind_full"],
    "northern_lights": ["warland_biomes:northern_lights_1", "warland_biomes:northern_lights_2", "warland_biomes:northern_lights_3", "warland_biomes:northern_lights_4", "warland_biomes:northern_lights_5"],
    "northern_lights_shorter": ["warland_biomes:northern_lights_1_shorter", "warland_biomes:northern_lights_2_shorter", "warland_biomes:northern_lights_3_shorter", "warland_biomes:northern_lights_4_shorter", "warland_biomes:northern_lights_5_shorter"],
    "birds": ["warland_biomes:sky_buzzard", "warland_biomes:sky_crow", "warland_biomes:sky_goose", "warland_biomes:bird_event"],
    "butterflies": ["warland_biomes:butterflies"],
    "ambient_leaves": ["warland_biomes:ambient_leaves_birch", "warland_biomes:ambient_leaves_normal", "warland_biomes:ambient_leaves_normal_emitter"],
    "nether_fireflies": ["warland_biomes:nether_fireflies"],
    "sand_ambient": ["warland_biomes:sand_air", "warland_biomes:sand_ground"],
    "soul_storm_dust": ["warland_biomes:soul_storm_dust"],
    "underwater_bubbles": ["warland_biomes:underwater_bubbles"],
    "underwater_dust": ["warland_biomes:underwater_dust"],
    "warped_dust": ["warland_biomes:warped_dust", "warland_biomes:warped_tree_spores"],
    "wind_gust": ["warland_biomes:wind_gust"]
};

function getRandomVariant(baseName, random) {
    const vars = ParticleVariants[baseName];
    if (!vars) return null;
    return vars[Math.floor(random() * vars.length)];
}

export function chooseParticle(biome, isRaining, isUnderwater, dimId, time, isThunderingGlobal, random = Math.random) {

    const isNight = time > 13000 && time < 23000;
    const r = random();

    if (isUnderwater) {
        if (r < 0.1) return getRandomVariant(random() > 0.5 ? "underwater_bubbles" : "underwater_dust", random);
        return null;
    }

    let baseParticle = null;

    if (biome.includes("ice") || biome.includes("frozen") || biome.includes("snow") || biome.includes("jagged")) {
        if (isThunderingGlobal) baseParticle = random() > 0.5 ? "blizzard_snow" : "blizzard_wind";
        else if (isRaining) baseParticle = "snow";
        else if (isNight) {
            if (r < 0.01) baseParticle = "northern_lights";
            else if (r < 0.02) baseParticle = "northern_lights_shorter";
        }
    }
    else if (biome.includes("badlands") || biome.includes("mesa")) {
        if (isRaining || isThunderingGlobal) {
            if (r < 0.2) baseParticle = "red_sand_mote";
            else if (r < 0.4) baseParticle = "sand_ambient";
            else if (r < 0.5) baseParticle = "tumble_bush";
            else if (r < 0.6) baseParticle = "tumble_bush";
            else baseParticle = "wind_trail";
        } else if (r < 0.1) {
            const types = ["red_sand_mote", "sand_ambient", "tumble_bush", "tumble_bush"];
            baseParticle = types[Math.floor(random() * types.length)];
        }
    }
    else if (biome.includes("desert") || biome.includes("savanna")) {
        if (isRaining || isThunderingGlobal) {
            if (r < 0.2) baseParticle = "sand_mote";
            else if (r < 0.4) baseParticle = "sand_ambient";
            else if (r < 0.5) baseParticle = "tumble_bush";
            else if (r < 0.6) baseParticle = "tumble_bush";
            else baseParticle = "wind";
        } else if (r < 0.1) {
            const types = ["sand_mote", "sand_ambient", "tumble_bush", "tumble_bush"];
            baseParticle = types[Math.floor(random() * types.length)];
        }
    }
    else if (biome.includes("swamp") || biome.includes("mangrove")) {
        if (isNight && !isRaining) baseParticle = random() > 0.5 ? "firefly" : "firefly";
        else if (!isRaining && r > 0.8) baseParticle = "butterflies";
    }
    else if (biome.includes("jungle")) {
        if (isThunderingGlobal) {
            if (r < 0.5) baseParticle = "wind";
            else baseParticle = "rain";
        } else if (isRaining) {
            if (r < 0.33) baseParticle = "rain";
            else if (r < 0.66) baseParticle = "rain_splash";
            else baseParticle = "rain_trail";
        } else if (!isNight) {
            if (r < 0.1) baseParticle = "birds";
            else if (r < 0.3) baseParticle = "ambient_leaves";
        }
    }
    else if (biome.includes("warped")) {
        if (r < 0.25) baseParticle = "warped_spore";
        else if (r < 0.5) baseParticle = "warped_dust";
    }
    else if (biome.includes("crimson")) {
        if (r < 0.5) baseParticle = random() > 0.5 ? "weeping_tear" : "weeping_tear_splash";
    }
    else if (biome.includes("soul")) {
        if (r < 0.25) baseParticle = "storm_soul";
        else if (r < 0.5) baseParticle = "soul_storm_dust";
    }
    else if (dimId === "minecraft:nether") {
        if (r < 0.2) baseParticle = "nether_fireflies";
    }
    else if (biome.includes("forest") || biome.includes("taiga") || biome.includes("grove") || biome.includes("cherry")) {
        if (isThunderingGlobal) {
            if (r < 0.25) baseParticle = "wind";
            else if (r < 0.5) baseParticle = "wind_gust";
            else baseParticle = "rain";
        } else if (isRaining) {
            if (r < 0.33) baseParticle = "rain";
            else if (r < 0.66) baseParticle = "rain_splash";
            else baseParticle = "rain_trail";
        } else if (!isNight) {
            if (r < 0.1) baseParticle = "birds";
            else if (r < 0.2) baseParticle = "butterflies";
            else if (r < 0.5) baseParticle = "ambient_leaves";
        } else if (r < 0.05) {
            baseParticle = "wind";
        }
    }
    else {
        if (isThunderingGlobal) {
            if (r < 0.25) baseParticle = "wind";
            else if (r < 0.5) baseParticle = "wind_gust";
            else baseParticle = "rain";
        } else if (isRaining) {
            if (r < 0.33) baseParticle = "rain";
            else if (r < 0.66) baseParticle = "rain_splash";
            else baseParticle = "rain_trail";
        } else if (!isNight) {
            if (r < 0.05) baseParticle = "birds";
            else if (r < 0.1) baseParticle = "butterflies";
        } else if (r < 0.02) {
            baseParticle = "wind";
        } else if (r < 0.04) {
            baseParticle = "wind_gust";
        }
    }

    if (!baseParticle) return null;
    return getRandomVariant(baseParticle, random);
}

