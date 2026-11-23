# ✈️ Armed Skies: Axis in the Blue

Shooter vertical de caças em HTML5 Canvas. Pilote seu jato, derrube ondas de inimigos, enfrente chefes e entre para o quadro de honra. Feito com HTML, CSS e JavaScript puro, sem dependências e sem build.

## Como jogar

1. Baixe ou clone o projeto mantendo a estrutura de pastas (veja abaixo).
2. Abra o `index.html` no navegador.
3. Digite seu *call sign* (até 12 caracteres) e aperte **ENTER** ou clique em **DECOLAR**.

Se o navegador bloquear o carregamento de imagens ou sons ao abrir o arquivo direto, sirva a pasta com um servidor local:

```bash
python3 -m http.server 8000
# depois acesse http://localhost:8000
```

## Controles

| Tecla | Ação |
| --- | --- |
| **W A S D** | Mover o caça |
| **ESPAÇO** | Metralhadora (segure para atirar) |
| **SHIFT** | Míssil (recarrega em 2 s) |
| **B** | Bomba |
| **P** | Pausar / continuar |
| **M** | Mutar / desmutar (durante o voo) |
| **R** | Nova surtida (na tela de game over) |
| **M** | Voltar ao menu e trocar de piloto (na tela de game over) |

## Regras

- Você começa com **3 vidas**. Tiros, mísseis e colisões com inimigos custam 1 vida cada.
- **Se um inimigo passar pela parte de baixo da tela, é game over na hora**, mesmo com vidas sobrando.
- Cada missão (onda) tem `3 + 3 × número da missão` inimigos. A cada missão os inimigos ficam mais rápidos e aparecem com mais frequência.
- Ao limpar uma onda há uma pausa de 3 s antes da próxima.

### Inimigos

| Inimigo | Aparece a partir da | Vida | Pontos | Comportamento |
| --- | --- | --- | --- | --- |
| Caça básico | Missão 1 | 1 | 15 | Só desce a tela |
| Caça de combate | Missão 2 | 2 | 30 | Mais rápido, atira projéteis |
| Bombardeiro | Missão 3 | 5 | 75 | Mais lento, lança mísseis |
| **Chefe** | Missão 10, 20, 30... | 250 (+50 a cada novo chefe) | 1000 | Tiros em espiral e mísseis; a partir do 2º chefe também invoca inimigos |

A metralhadora causa 1 de dano e o míssil causa 5. Ao derrotar um chefe, todos os outros inimigos da tela somem.

### Bombas

Você começa sem bombas e ganha pelas recompensas. Uma bomba apaga todos os tiros inimigos, destrói todos os inimigos comuns da tela (que dão pontos normalmente) e causa 100 de dano ao chefe.

### Recompensas

A cada **5 missões** concluídas você ganha **+1 vida** e um upgrade sorteado:

- Canhão duplo
- Mísseis duplos
- +1 bomba
- Turbinas (mais velocidade)
- Mais RPM (tiro e míssil recarregam mais rápido)

## Quadro de honra

Os 5 melhores pilotos ficam salvos no `localStorage` do navegador. Cada *call sign* guarda apenas a melhor pontuação, junto com a missão alcançada. Se você deixar o nome em branco, o piloto vira **MAVERICK**.

## Estrutura do projeto

```
.
├── index.html      # telas (início, pausa, game over) e HUD
├── style.css       # visual do jogo e dos menus
├── game.js         # lógica, entidades, áudio e recordes
├── img/
│   ├── ally_ship.png
│   ├── enemy1.png
│   ├── enemy3.png
│   ├── enemy5.png
│   ├── boss.png
│   ├── player_bullet.png
│   └── missile.png
└── snd/
    ├── bgm.mp3
    ├── boss.mp3
    ├── shoot.mp3
    ├── missile.mp3
    ├── damage.mp3
    ├── bomb.mp3
    └── gameover.mp3
```

Se algum sprite não carregar, o jogo desenha uma forma simples no lugar. Se algum som estiver faltando, ele é ignorado sem travar o jogo.

## Personalização

- **Sprites e sons:** troque os arquivos em `img/` e `snd/` ou altere os caminhos em `SPRITE_PATHS` e `SOUND_PATHS`, no início do `game.js`.
- **Volumes:** ajuste o objeto `SOUND_VOLUMES` (valores de 0 a 1).
- **Equilíbrio:** vidas iniciais, velocidade, tempos de recarga, vida dos inimigos e pontuação ficam nas classes `Player`, `Enemy`, `FighterEnemy`, `BomberEnemy` e `BossEnemy`.

## Modo debug

Usar o call sign `DEBUG123` começa a partida na missão 9, com 10 vidas, 5 bombas e todos os upgrades. Nesse modo a pontuação não é salva no quadro de honra.
