/* Official reference models, not Cyclify inventory. Sources checked 19 Oct 2026.
   Geometry is for the named size; photos are not scale drawings. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.CyclifyRideModel = model;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const styles = {
    endurance: {
      label: 'Endurance', name: 'S-Works Roubaix SL8', year: '2024', build: 'SRAM RED AXS', size: '56',
      title: 'Long roads. A calmer ride.', terrain: 'Long-distance road',
      description: 'A taller front end and Future Shock 3.3 put comfort at the centre of this endurance road bike.',
      features: ['Future Shock 3.3', '700 × 32c road tyres', 'Carbon endurance frame'],
      insight: 'The size-56 Roubaix has 40 mm more published stack than the size-56 Tarmac shown here. Suspension, spacers and bars also affect your actual hand position.',
      note: 'Size 56. Stack and reach use Specialized’s published Roubaix reference points, including the Future Shock layout; cockpit setup still affects fit.',
      values: { stack: '605 mm', reach: '389 mm', steering: '73°', wheelbase: '1,012 mm', seat: '73.5°', tyres: '700 × 32c' },
      source: 'https://www.specialized.com/us/en/s-works-roubaix-sl8-sram-red-axs/p/216941',
      photoPrefix: '94423-00_ROUBAIX-SW-SMK-BLKPRL', heroSuffix: 'HERO', detailSuffix: 'D1-POV', diagramKey: 'geometry_roubaix_geometry',
      shop: 'road-bikes-india.html', shopLabel: 'Browse Cyclify road bikes'
    },
    gravel: {
      label: 'Gravel', name: 'S-Works Diverge STR', year: '2023', build: 'SRAM RED eTap AXS / XX1 Eagle', size: '56',
      title: 'Beyond the tarmac.', terrain: 'Mixed surfaces & gravel',
      description: 'A real gravel design with front and rear Future Shock, wider tyres and room for rougher routes.',
      features: ['20 mm front / 30 mm rear rider suspension', '700 × 42 tyres', '47 mm clearance with 700c wheels'],
      insight: 'At size 56, its 1,044 mm wheelbase is 32 mm longer than the Roubaix example. That is one contributor to a more settled stance on uneven ground.',
      note: 'Size 56. Future Shock suspends the rider, not the wheels. Use the manufacturer’s frame-post and suspension setup guidance.',
      values: { stack: '609 mm', reach: '392 mm', steering: '71.75°', wheelbase: '1,044 mm', seat: '74°', tyres: '700 × 42' },
      source: 'https://www.specialized.com/us/en/s-works-diverge-str/p/200576',
      photoPrefix: '96223-00_DIVERGE-STR-SW-FSTGRN-DKMOS-BLKPRL', heroSuffix: 'HERO', detailSuffix: 'D4-STTT', diagramKey: 'geometry_diverge-str_geometry',
      shop: 'index.html?search=gravel', shopLabel: 'Browse Cyclify gravel products'
    },
    aero: {
      label: 'Aero / Race', name: 'S-Works Tarmac SL8', year: '2024', build: 'Shimano Dura-Ace Di2', size: '56',
      title: 'Built around speed.', terrain: 'Road racing & fast rides',
      description: 'Aero-shaped tubes, a lower frame stack and deep carbon wheels give this actual race bike its character.',
      features: ['Roval Rapide integrated cockpit', '51 / 60 mm wheel depths', '32 mm tyre clearance'],
      insight: 'Its size-56 frame stack is 565 mm and frame reach is 395 mm. These are frame measurements—not the separate “stack to stem” and “reach to stem” values.',
      note: 'Size 56. Frame stack/reach shown. The manufacturer separately lists 573 mm stack to stem and 393 mm reach to stem.',
      values: { stack: '565 mm', reach: '395 mm', steering: '73.5°', wheelbase: '991 mm', seat: '73.5°', tyres: '700 × 26' },
      source: 'https://www.specialized.com/us/en/s-works-tarmac-sl8-shimano-dura-ace-di2/p/216953',
      photoPrefix: '94924-00_TARMAC-SL8-SW-DI2-FOGTNT-GRNGSTPRL-REDGSTPRL', heroSuffix: 'HERO', detailSuffix: 'D1-POV', diagramKey: 'geometry_tarmac_geometry',
      shop: 'road-bikes-india.html', shopLabel: 'Browse Cyclify road bikes'
    },
    mtb: {
      label: 'MTB', name: 'S-Works Epic 8', year: '2024', build: 'SRAM XX SL AXS / Flight Attendant', size: 'M',
      title: 'Built for the trail ahead.', terrain: 'Cross-country mountain biking',
      description: 'A full-suspension XC bike with 120 mm travel, a slack steering angle and space to move over the bike.',
      features: ['120 mm front & rear travel', '29 × 2.35 tyres', 'Adjustable high / low geometry'],
      insight: 'The medium Epic has 450 mm reach in its low setting. Its 65.9° head angle becomes 66.4° in high. MTB reach is not directly interchangeable with road-bike sizing.',
      note: 'Size M. Reach and head angle shown in low setting; other values follow the published M chart. Suspension sag changes riding geometry.',
      values: { stack: '598 mm', reach: '450 mm', steering: '65.9°', wheelbase: '1,179 mm', seat: '75.5°', tyres: '29 × 2.35″' },
      source: 'https://www.specialized.com/gb/en/s-works-epic-8-sram-xx-sl-axs-rockshox-ultimate-flight-attendant/p/220875',
      photoPrefix: '90324-00_EPIC-SW-CARB-VIVPNKMET-MNSHDWMET', heroSuffix: 'HERO-PDP', detailSuffix: 'D6-LINK', diagramKey: 'geometry_epic_geometry',
      shop: 'mountain-bikes-india.html', shopLabel: 'Browse Cyclify mountain bikes'
    }
  };
  const views = [{ id: 'side', label: 'Full bike' }, { id: 'angle', label: 'Three-quarter' }, { id: 'detail', label: 'Details' }];
  Object.entries(styles).forEach(([id, bike]) => {
    bike.images = views.map((view, index) => {
      const suffix = [bike.heroSuffix, 'FDSQ', bike.detailSuffix][index];
      return { ...view, src: 'assets/images/ride-studio/'+id+'-'+view.id+'.webp', small: 'assets/images/ride-studio/'+id+'-'+view.id+'-small.webp',
        alt: bike.year+' Specialized '+bike.name+' — '+view.label.toLowerCase(),
        original: 'https://resources.specialized.com/image/'+bike.photoPrefix+'_'+suffix+'?bg=f1f1f1&w=1536&h=1536&fit=max&q=85' };
    });
    bike.diagram = 'assets/images/ride-studio/'+id+'-geometry.webp';
    bike.diagramSource = 'https://resources.specialized.com/image/'+bike.diagramKey+'?w=877&h=538&q=75';
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
