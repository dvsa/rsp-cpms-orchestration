export default (referenceNumber, penaltyType) => {
	// IM reference sent to this service with suffixed type in ref number already
	if (penaltyType === 'IM') {
		return referenceNumber;
	}
	return `${referenceNumber}_${penaltyType}`;
};
