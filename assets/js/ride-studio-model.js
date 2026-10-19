/* Official reference models, not Cyclify inventory. Sources checked 19 Oct 2026.
   Geometry is for the named size; photos are not scale drawings. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.CyclifyRideModel = model;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const specializedPhoto = suffix => 'https://resources.specialized.com/image/94425-31_ROUBAIX-EXPERT-VLTPRL-SILDST_'+suffix+'?bg=f1f1f1&w=1536&h=1536&fit=max&q=85';
  const styles = {
    endurance: {
      brand: 'Specialized', label: 'Endurance', name: 'Specialized Roubaix SL8 Expert', year: '2025', build: 'SRAM Rival eTAP AXS · FACT 10R carbon', size: '56',
      title: 'Long roads. A calmer ride.', terrain: 'Long-distance road',
      description: 'A higher front end, Future Shock 3.2 and a flexible Pavé seatpost support long days on uneven roads.',
      features: ['Future Shock 3.2', '700 × 32c road tyres', 'Roval Terra C carbon wheels'],
      insight: 'The size-56 Roubaix has 40 mm more published stack than the size-56 S5 here. Their reference points and cockpits differ, so that is not a direct measure of handlebar height.',
      note: 'Size 56. Published Roubaix stack and reach include the Future Shock layout. Stem, spacers, bars and saddle setup also affect fit.',
      values: { stack: '605 mm', reach: '389 mm', steering: '73°', wheelbase: '1,012 mm', seat: '73.5°', tyres: '700 × 32c' },
      source: 'https://www.specialized.com/us/en/roubaix-sl8-expert-sram-rival-etap-axs/p/4221821',
      assetKey: 'roubaix-sl8-expert-2025',
      photos: [
        { label: 'Full bike', original: specializedPhoto('HERO-PDP') },
        { label: 'Three-quarter', original: specializedPhoto('FDSQ') },
        { label: 'Cockpit', original: specializedPhoto('D1-POV') }
      ],
      diagramSource: 'https://resources.specialized.com/image/geometry_roubaix_geometry?w=877&h=538&q=75',
      diagramAlt: 'Specialized Roubaix SL8 manufacturer geometry reference',
      diagramCaption: 'Manufacturer reference diagram. Measurements shown use size 56.',
      shop: 'road-bikes-india.html', shopLabel: 'Browse Cyclify road bikes'
    },
    gravel: {
      brand: 'Canyon', label: 'Gravel', name: 'Canyon Grizl 7 ESC', year: 'Current model', build: 'Aluminium · Shimano GRX 1×12 · Honeymelon', size: 'M',
      title: 'Take the long way home.', terrain: 'Gravel & loaded adventures',
      description: 'An aluminium adventure bike with a carbon fork, loop-style Full Mounty bar and mounts for longer rides beyond the tarmac.',
      features: ['Full Mounty adventure cockpit', '45 mm fitted tyres', '54 mm maximum tyre clearance'],
      insight: 'Its size-M wheelbase is 1,076 mm. The longer stance and wide tyres suit mixed surfaces, but a Canyon M is not automatically equivalent to another brand’s 56.',
      note: 'Size M, Grizl AL model 4445—not the Grizl CF. Frame stack/reach are 596/404 mm; Canyon separately lists effective cockpit measurements. Tyre clearance is not fitted tyre width.',
      values: { stack: '596 mm', reach: '404 mm', steering: '71°', wheelbase: '1,076 mm', seat: '73.5°', tyres: '45 mm' },
      source: 'https://www.canyon.com/en-ca/gravel-bikes/adventure/grizl/al/grizl-7-esc/4445.html',
      assetKey: 'grizl-7-esc-al-4445',
      photos: [
        { label: 'Full bike', original: 'https://dma.canyon.com/image/upload/w_1439,c_fit/b_rgb:F2F2F2/f_auto/q_auto/v1777880401/2027_FULL_grizl_al-escape_4445_R124_P03_ugfvoo' },
        { label: 'Frame', original: 'https://dma.canyon.com/image/upload/w_1439,c_fit/f_auto/q_auto/v1778062222/2027_TOP-1_grizl_al-escape_4445_R124_P03_frame_x1cy5v' },
        { label: 'Cockpit', original: 'https://dma.canyon.com/image/upload/w_1439,c_fit/f_auto/q_auto/v1778062229/2027_TOP-3_grizl_al-escape_4445_R124_P03_cockpit_igg47g' }
      ],
      diagramSource: 'https://www.canyon.com/on/demandware.static/-/Sites-canyon-master/default/dwed101452/images/geometry/2026_Launc/2026/2026_Launch_Geo_drawing_AL_Grizl_Web_PDP_01_366x300_ALL.svg',
      diagramAlt: 'Canyon Grizl AL manufacturer geometry reference',
      diagramCaption: 'Manufacturer reference diagram. Measurements shown use size M.',
      shop: 'index.html?search=gravel', shopLabel: 'Browse Cyclify gravel products'
    },
    aero: {
      brand: 'Cervélo', label: 'Aero / Race', name: 'Cervélo S5', year: 'Current model', build: 'SRAM RED AXS · Five Black', size: '56',
      title: 'Built around speed.', terrain: 'Road racing & fast rides',
      description: 'The S5 pairs deep aero tube profiles with its distinctive one-piece V-shaped cockpit and Reserve 57|64 wheels.',
      features: ['HB19 one-piece carbon cockpit', 'Reserve 57|64 TA wheels', '700 × 29c Vittoria tyres'],
      insight: 'At size 56, the frame has 565 mm stack and 392 mm reach. A lower frame can support a lower riding position, but aero performance also depends on fit, posture and conditions.',
      note: 'Size 56, current S5 generation. Geometry is from Cervélo’s frame chart; the cockpit and rider position are separate. Gallery shows the full bike, frame detail and HB19 cockpit—not a 360° model.',
      values: { stack: '565 mm', reach: '392 mm', steering: '73.5°', wheelbase: '982 mm', seat: '73°', tyres: '700 × 29c' },
      source: 'https://www.cervelo.com/en-US/bikes/s5',
      assetKey: 'cervelo-s5-red-axs',
      photos: [
        { label: 'Full bike', original: 'https://images.prismic.io/cervelo/ajQs241P9HI4Us-y_0M0S5GRX1CPROFILE-WEB.png?auto=format,compress&w=1800' },
        { label: 'Frame', original: 'https://images.prismic.io/cervelo/INW7XCjk8JSiQY7M_0M0S5GRX1C-DETAIL-1.jpg?auto=format,compress&w=1800' },
        { label: 'Cockpit', original: 'https://images.prismic.io/cervelo/aGRPpHfc4bHWi7_j_Untitleddesign-13-.png?auto=format,compress&w=1800' }
      ],
      diagramSource: null,
      diagramAlt: 'Cervélo S5 side photograph, not a scale drawing',
      diagramCaption: 'Side view for reference, not to scale. Open Cervélo’s official geometry chart.',
      shop: 'road-bikes-india.html', shopLabel: 'Browse Cyclify road bikes'
    },
    mtb: {
      brand: 'Cannondale', label: 'MTB', name: 'Cannondale Bad Habit 1', year: '2026', build: 'C2311GU · SRAM XO Eagle AXS · Raw carbon', size: 'MD',
      title: 'Made for demanding descents.', terrain: 'Enduro mountain biking',
      description: 'A carbon enduro bike with a 29-inch front wheel, 27.5-inch rear wheel and long-travel suspension for technical trails.',
      features: ['160 mm fork / 155 mm rear travel', 'Mixed 29″ / 27.5″ wheels', '2.4″ Continental Kryptotal tyres'],
      insight: 'The medium frame combines 455 mm reach, a 64° head angle and a 1,224 mm wheelbase. Its 77.7° effective seat angle differs from the 70.2° actual seat-tube angle.',
      note: 'Size MD, current Bad Habit—not the older plus-tyre model. Figures use the standard published geometry. Suspension sag and headset adjustment alter riding geometry; MTB sizing is not interchangeable with road sizing.',
      values: { stack: '641 mm', reach: '455 mm', steering: '64°', wheelbase: '1,224 mm', seat: '77.7°', tyres: '2.4″ wide' },
      metricLabels: { seat: 'Effective seat angle' },
      source: 'https://www.cannondale.com/en/bikes/mountain/enduro/bad-habit/bad-habit-1-smu',
      assetKey: 'bad-habit-1-2026',
      photos: [
        { label: 'Full bike', original: 'https://embed.widencdn.net/img/dorelrl/qbprjfyz5s/2000px@1x/C26_C2311GU_Bad_Habit_RAW_PD.png' },
        { label: 'Three-quarter', original: 'https://embed.widencdn.net/img/dorelrl/agxylsbm5o/2000px@1x/C26_C2311GU_Bad_Habit_RAW_3Q.png' },
        { label: 'Details', original: 'https://embed.widencdn.net/img/dorelrl/lfy1pamxc2/2000px@1x/C26_C2311GU_Bad_Habit_RAW_D1.png' }
      ],
      diagramSource: 'https://www.cannondale.com/-/media/images/my26/bikes/mountain/enduro/bad-habit/pdp/c26_badhabit_geo_table_v2.ashx?h=2693&hash=FB6E5378C82F5F9BE8BBADEA28CE3E87&iar=0&w=1800',
      diagramAlt: 'Cannondale Bad Habit manufacturer geometry diagram and size table',
      diagramCaption: 'Open the full manufacturer chart. Measurements shown here use size MD.',
      shop: 'mountain-bikes-india.html', shopLabel: 'Browse Cyclify mountain bikes'
    }
  };
  const views = [{ id: 'side' }, { id: 'angle' }, { id: 'detail' }];
  Object.values(styles).forEach(bike => {
    bike.images = bike.photos.map((photo, index) => ({
      ...photo, id: views[index].id,
      src: 'assets/images/ride-studio/'+bike.assetKey+'-'+views[index].id+'.webp',
      small: 'assets/images/ride-studio/'+bike.assetKey+'-'+views[index].id+'-small.webp',
      alt: bike.name+' — '+photo.label.toLowerCase()
    }));
    bike.diagram = bike.diagramSource ? 'assets/images/ride-studio/'+bike.assetKey+'-geometry.webp' : bike.images[0].src;
  });
  const metrics = {
    stack: { label: 'Stack', title: 'Height at the front of the frame.', text: 'The vertical distance from the bottom bracket to the frame’s upper steering reference. More stack can support a higher cockpit. Suspension systems may use different reference points; check the model notes.' },
    reach: { label: 'Reach', title: 'Frame length in front of the pedals.', text: 'The horizontal distance from the bottom bracket to the upper steering reference. It is not saddle-to-handlebar distance: stem, bars and saddle position also matter.' },
    steering: { label: 'Head angle', title: 'One part of the steering feel.', text: 'The steering-axis angle to the ground. A slacker angle often favours composure. Fork offset, tyre size and trail also influence steering; angle alone does not determine handling.' },
    wheelbase: { label: 'Wheelbase', title: 'Distance between the wheel axles.', text: 'A longer wheelbase generally supports stability; a shorter one can feel more agile. Compare similar frame sizes and intended uses, not just one number.' },
    seat: { label: 'Seat angle', title: 'How the saddle relates to the pedals.', text: 'Seat-tube angle influences seated weight position. Effective and actual angles can differ. Saddle height and rail adjustment also change your riding position.' },
    tyres: { label: 'Fitted tyres', title: 'The tyres fitted to this specific build.', text: 'These are the manufacturer’s fitted tyre sizes, not maximum frame clearance. Tyre width, rim compatibility, pressure and terrain all matter. Follow the frame, rim and tyre makers’ limits.' }
  };
  return { styles, views, metrics };
});
