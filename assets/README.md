# EduCity Assets v2

Grid 32 px. Karakter 32x32, tile 32x32, bangunan 64x64, pohon/lampu/rak 32x64.

## Struktur
- svg/      sumber vektor (edit di Inkscape/Figma)
- png/      siap import engine (ukuran = SVG x --scale)
- sheets/   spritesheet: karakter (baris down,left,right,up; kolom frame 0-3), tileset_terrain, items, coin_spin, vfx
- audio/    sfx_*.wav + bgm_town_loop.wav (loop)
- assets.json  manifest: ukuran, flag collider, indeks frame tiap sheet

## Godot 4
- Import PNG, Filter = Nearest bila ingin gaya pixel; Linear bila tetap halus.
- TileSet: tile size 32x32, atlas tileset_terrain.png (urutan di assets.json).
- Animasi karakter: AnimatedSprite2D / Sprite2D hframes=4 vframes=4, baris 0=down, 1=left, 2=right, 3=up.
- Air beranimasi: tiles/water_0..3 (4 frame, ~6 fps).
- UI panel/dialog/progress: pakai NinePatchRect (margin ~14 px).

## Phaser / web
this.load.spritesheet('player','sheets/player_sheet.png',{frameWidth:32,frameHeight:32});

## Catatan
- Teks (huruf A/B/C/D, nominal koin) sengaja tidak dimasukkan ke gambar; render via font engine agar bisa dilokalkan.
- Audio dibuat prosedural (placeholder yang layak). Ganti dengan aset final sesuai kebutuhan.
