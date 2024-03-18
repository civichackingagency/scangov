const getGrade = score => {
    if (score >= 90)
        return 'A';
    if (score >= 80)
        return 'B';
    if (score >= 70)
        return 'C';
    if (score >= 60)
        return 'D';
    return 'F';
};

const getColor = score => {
    if (score >= 90)
        return 'success';
    if (score >= 70)
        return 'warning';
    return 'danger';
}