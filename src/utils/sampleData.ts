import { StoryboardPanel, StoryboardProject } from '../types/storyboard';

// Čistý, prázdný projekt bez předvyplněných textů
export const INITIAL_PROJECT: StoryboardProject = {
  id: 'proj-1',
  title: '',
  director: '',
  aspectRatio: '16:9',
  date: new Date().toISOString().split('T')[0],
  panels: [
    {
      id: 'panel-1',
      order: 1,
      scene: '1',
      shot: '1',
      cameraType: '',
      cameraMovement: '',
      action: '',
      dialogue: '',
      imageUrl: null,
      updatedAt: Date.now(),
      aspectRatio: '16:9'
    },
    {
      id: 'panel-2',
      order: 2,
      scene: '1',
      shot: '2',
      cameraType: '',
      cameraMovement: '',
      action: '',
      dialogue: '',
      imageUrl: null,
      updatedAt: Date.now(),
      aspectRatio: '16:9'
    },
    {
      id: 'panel-3',
      order: 3,
      scene: '1',
      shot: '3',
      cameraType: '',
      cameraMovement: '',
      action: '',
      dialogue: '',
      imageUrl: null,
      updatedAt: Date.now(),
      aspectRatio: '16:9'
    },
    {
      id: 'panel-4',
      order: 4,
      scene: '1',
      shot: '4',
      cameraType: '',
      cameraMovement: '',
      action: '',
      dialogue: '',
      imageUrl: null,
      updatedAt: Date.now(),
      aspectRatio: '16:9'
    },
    {
      id: 'panel-5',
      order: 5,
      scene: '1',
      shot: '5',
      cameraType: '',
      cameraMovement: '',
      action: '',
      dialogue: '',
      imageUrl: null,
      updatedAt: Date.now(),
      aspectRatio: '16:9'
    },
    {
      id: 'panel-6',
      order: 6,
      scene: '1',
      shot: '6',
      cameraType: '',
      cameraMovement: '',
      action: '',
      dialogue: '',
      imageUrl: null,
      updatedAt: Date.now(),
      aspectRatio: '16:9'
    }
  ]
};

export const CAMERA_TYPES = [
  'Velký celek (EWS)',
  'Celek (WS)',
  'Americký plán / Polocelek (MS)',
  'Polodetail (MCU)',
  'Detail (CU)',
  'Velký detail (ECU)',
  'Pohled přes rameno (OTS)',
  'Pohled z očí postavy (POV)',
  'Podhled (Žabí perspektiva)',
  'Nadhled (Ptačí perspektiva)',
  'Šikmý úhel (Dutch Angle)'
];

export const CAMERA_MOVEMENTS = [
  'Statická (Bez pohybu)',
  'Švenk vlevo',
  'Švenk vpravo',
  'Náklon nahoru',
  'Náklon dolů',
  'Jízda vpřed (Dolly In)',
  'Jízda vzad (Dolly Out)',
  'Sledovací záběr (Tracking)',
  'Jeřáb (Crane)',
  'Kamera z ruky (Handheld)',
  'Rychlý švenk (Whip Pan)',
  'Kruhová jízda (Orbit)'
];
